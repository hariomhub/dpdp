/**
 * An error that carries the HTTP status it should produce. Existing code throws plain Errors and the
 * error handler guesses a status from the message; new code should throw HttpError so the status is
 * explicit (403 is a 403, a too-large upload is a 413, and neither is a 500).
 */
export class HttpError extends Error {
  /** `extra` is merged into the JSON body (e.g. { requiresConfirmation: true }) so a client can act on it. */
  constructor(public readonly status: number, message: string, public readonly extra?: Record<string, unknown>) {
    super(message)
    this.name = 'HttpError'
  }

  static badRequest(msg: string)   { return new HttpError(400, msg) }
  static unauthorized(msg = 'Unauthorized') { return new HttpError(401, msg) }
  static forbidden(msg = 'Insufficient permissions') { return new HttpError(403, msg) }
  static notFound(msg: string)     { return new HttpError(404, msg) }
  static conflict(msg: string, extra?: Record<string, unknown>) { return new HttpError(409, msg, extra) }
  static tooLarge(msg: string)     { return new HttpError(413, msg) }
  static unavailable(msg: string)  { return new HttpError(503, msg) }
}
