import { WriteGuardError } from "@meminspect/core";

export function writeGuardStatus(err: WriteGuardError): 403 | 404 | 409 | 500 {
  switch (err.code) {
    case "NOT_FOUND":
      return 404;
    case "READ_ONLY":
    case "SQLITE_WRITE_UNSUPPORTED":
      return 403;
    case "UNDO_UNAVAILABLE":
      return 409;
    default:
      return 500;
  }
}
