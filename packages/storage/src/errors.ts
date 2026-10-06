/** The requested object does not exist in the store. */
export class StorageNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`Stored object not found: ${key}`)
    this.name = 'StorageNotFoundError'
  }
}

/** A key failed validation (path traversal, odd characters, too long...). */
export class UnsafeKeyError extends Error {
  constructor(key: string, reason: string) {
    super(`Unsafe storage key "${key}": ${reason}`)
    this.name = 'UnsafeKeyError'
  }
}
