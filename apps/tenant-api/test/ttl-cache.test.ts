import { describe, expect, it, vi } from 'vitest'
import { TtlCache } from '../src/utils/ttl-cache'

describe('TtlCache', () => {
  it('loads once, then serves from cache until the TTL passes', async () => {
    let now = 1_000
    const load = vi.fn(async (k: string) => `v:${k}`)
    const c = new TtlCache(load, 30_000, () => now)

    expect(await c.get('a')).toBe('v:a')
    expect(await c.get('a')).toBe('v:a')
    expect(load).toHaveBeenCalledTimes(1)

    now += 29_999
    await c.get('a')
    expect(load).toHaveBeenCalledTimes(1)

    now += 2
    await c.get('a')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('keeps keys separate', async () => {
    const load = vi.fn(async (k: string) => k.toUpperCase())
    const c = new TtlCache(load, 1000)
    expect(await c.get('a')).toBe('A')
    expect(await c.get('b')).toBe('B')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('concurrent lookups for one key share a single load', async () => {
    let release!: (v: string) => void
    const load = vi.fn(() => new Promise<string>(r => { release = r }))
    const c = new TtlCache(load, 1000)
    const all = Promise.all([c.get('a'), c.get('a'), c.get('a')])
    release('shared')
    expect(await all).toEqual(['shared', 'shared', 'shared'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failed load', async () => {
    const load = vi.fn<(k: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce('ok')
    const c = new TtlCache(load, 1000)
    await expect(c.get('a')).rejects.toThrow('db down')
    expect(await c.get('a')).toBe('ok')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('invalidate forces a reload (one key or all)', async () => {
    const load = vi.fn(async (k: string) => k)
    const c = new TtlCache(load, 60_000)
    await c.get('a'); await c.get('b')
    c.invalidate('a')
    await c.get('a'); await c.get('b')
    expect(load).toHaveBeenCalledTimes(3)
    c.invalidate()
    await c.get('a'); await c.get('b')
    expect(load).toHaveBeenCalledTimes(5)
  })
})
