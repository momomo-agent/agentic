// errors.ts — Typed error classes for agentic-filesystem

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`)
    this.name = 'NotFoundError'
  }
}

export class PermissionDeniedError extends Error {
  constructor(msg = 'Permission denied') {
    super(msg)
    this.name = 'PermissionDeniedError'
  }
}

export class IOError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'IOError'
  }
}
