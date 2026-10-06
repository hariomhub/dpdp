import type { CorsOptions } from 'cors'
import type { HelmetOptions } from 'helmet'

/**
 * Browser-facing security policy for the portal: which origins may call the API, and which resources a page may load.
 * Pure functions of the settings, so the policy is unit-tested without starting a server.
 */

export function originOf(url: string | undefined): string | null {
  if (!url) return null
  try { return new URL(url).origin } catch { return null }
}

export interface CorsSettings {
  appUrl?: string
  extraOrigins: string[]
  production: boolean
}

/**
 * The portal and its API share one address in every deployment, so cross-origin access is the exception. Allowed:
 * the portal's own origin, anything listed in CORS_ALLOWED_ORIGINS, and (outside production) the Vite dev server.
 * A request with no Origin header (same-origin GET, curl, a health probe) is not a cross-origin request and is unaffected.
 */
export function allowedOrigins(s: CorsSettings): string[] {
  const own = originOf(s.appUrl)
  const list = [...(own ? [own] : []), ...s.extraOrigins]
  if (!s.production) list.push('http://localhost:5173', 'http://127.0.0.1:5173')
  return [...new Set(list)]
}

export function buildCorsOptions(s: CorsSettings): CorsOptions {
  const allowed = new Set(allowedOrigins(s))
  return {
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    credentials: true,
    maxAge: 600,
  }
}

export interface HelmetSettings {
  cspMode: 'enforce' | 'report-only' | 'off'
  /** https portal => send HSTS. A plain-http intranet install must not, and must not upgrade requests to https. */
  https: boolean
}

/**
 * Content-Security-Policy for the single-page app served by this process.
 *  - scripts only from the app itself (the build has no inline scripts);
 *  - inline styles are allowed (the UI library sets style attributes); Google Fonts is allowed until fonts are bundled;
 *  - images/media may come from https (course media, certificate images) and blob:/data:;
 *  - LMS lessons may embed an https video page;
 *  - the page can never be framed, and cannot be given a different <base>, plugin or form target.
 * `upgrade-insecure-requests` is intentionally absent: it would break a portal served over plain http on an intranet.
 */
export function buildHelmetOptions(s: HelmetSettings): HelmetOptions {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    mediaSrc: ["'self'", 'blob:', 'https:'],
    frameSrc: ["'self'", 'https:'],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  }
  return {
    contentSecurityPolicy: s.cspMode === 'off'
      ? false
      : { useDefaults: false, directives, reportOnly: s.cspMode === 'report-only' },
    crossOriginEmbedderPolicy: false,
    hsts: s.https ? { maxAge: 15552000, includeSubDomains: false } : false,
  }
}
