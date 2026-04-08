// src/errors.ts
var NotFoundError = class extends Error {
  constructor(path) {
    super(`Not found: ${path}`);
    this.name = "NotFoundError";
  }
};
var PermissionDeniedError = class extends Error {
  constructor(msg = "Permission denied") {
    super(msg);
    this.name = "PermissionDeniedError";
  }
};
var IOError = class extends Error {
  constructor(msg) {
    super(msg);
    this.name = "IOError";
  }
};

export {
  NotFoundError,
  PermissionDeniedError,
  IOError
};
//# sourceMappingURL=chunk-AP75BLWF.js.map