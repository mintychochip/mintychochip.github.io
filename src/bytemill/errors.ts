import { BytemillError } from './wasm';
import { locateOffset, type SourceLocation } from './wire';

export interface ErrorView {
  kind: string;
  message: string;
  location: SourceLocation | null;
  /** Decode errors point at a byte in the payload, not a line in the schema. */
  wireOffset: number | null;
}

/** Turn a bridge error into the kind, message, and source line to render. */
export function describeError(error: unknown, source: string): ErrorView {
  if (error instanceof BytemillError) {
    const wireOffset = error.kind === 'DecodeError' ? error.offset : null;
    return {
      kind: error.kind,
      message: error.message,
      location:
        error.offset !== null && wireOffset === null
          ? locateOffset(source, error.offset)
          : null,
      wireOffset,
    };
  }
  return {
    kind: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
    location: null,
    wireOffset: null,
  };
}
