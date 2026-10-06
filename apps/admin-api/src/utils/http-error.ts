/** An error that carries the HTTP status it should produce (see the tenant API's copy for the rationale). */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }

  static badRequest(msg: string) { return new HttpError(400, msg) }
  static notFound(msg: string)   { return new HttpError(404, msg) }
  static tooLarge(msg: string)   { return new HttpError(413, msg) }
  static unavailable(msg: string) { return new HttpError(503, msg) }
}
