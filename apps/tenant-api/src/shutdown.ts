import type { Server } from 'http'

/**
 * Graceful shutdown. On SIGTERM (a new revision replacing this one, a scale-in, a deploy) the process:
 *  1. reports not-ready at once, so the load balancer stops sending new requests;
 *  2. stops accepting connections and lets requests already in flight finish - up to `graceMs`;
 *  3. closes queues and database pools;
 *  4. exits 0 (1 if it had to cut requests off).
 * Without this, every deploy or scale event dropped whatever requests were running at that moment.
 */
export interface Closer { name: string; close: () => Promise<unknown> }

export interface ShutdownDeps {
  server: Pick<Server, 'close'> & Partial<Pick<Server, 'closeIdleConnections' | 'closeAllConnections'>>
  markNotReady: () => void
  closers: Closer[]
  graceMs: number
  exit: (code: number) => void
  log?: (msg: string) => void
  closerTimeoutMs?: number
}

export function createShutdown(deps: ShutdownDeps): (signal: string) => Promise<void> {
  const log = deps.log ?? console.log
  const closerTimeout = deps.closerTimeoutMs ?? 5000
  let started = false

  return async (signal: string) => {
    if (started) return
    started = true
    log(`[shutdown] ${signal} received - draining requests (up to ${Math.round(deps.graceMs / 1000)} s)`)
    deps.markNotReady()

    let forced = false
    const closed = new Promise<void>(resolve => deps.server.close(() => resolve()))
    deps.server.closeIdleConnections?.()
    const sweep = setInterval(() => deps.server.closeIdleConnections?.(), 500)

    await Promise.race([
      closed,
      new Promise<void>(resolve => setTimeout(() => { forced = true; resolve() }, deps.graceMs).unref?.()),
    ])
    clearInterval(sweep)
    if (forced) {
      log('[shutdown] grace period over - closing remaining connections')
      deps.server.closeAllConnections?.()
    }

    for (const c of deps.closers) {
      try {
        await Promise.race([
          c.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), closerTimeout).unref?.()),
        ])
      } catch (err: any) {
        log(`[shutdown] could not close ${c.name}: ${err?.message ?? err}`)
      }
    }
    log('[shutdown] done')
    deps.exit(forced ? 1 : 0)
  }
}
