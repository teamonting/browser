import { is, literal, number, object, optional, parse, string, tuple, unknown, type InferOutput } from 'valibot';
import { MARSHALLED_ERROR_SIGNATURE } from './constant.ts';

const extendedErrorSchema = object({
  cause: unknown(),
  columnNumber: optional(number()),
  fileName: optional(string()),
  lineNumber: optional(number()),
  message: optional(string()),
  name: string(),
  stack: optional(string())
});

type ExtendedError = InferOutput<typeof extendedErrorSchema> & Error;

const marshalledErrorSchema = tuple([literal(MARSHALLED_ERROR_SIGNATURE), extendedErrorSchema]);

type MarshalledError = InferOutput<typeof marshalledErrorSchema>;

function isMarshalledError(value: unknown): value is MarshalledError {
  return is(marshalledErrorSchema, value);
}

function marshalError(value: Error): MarshalledError {
  return parse(marshalledErrorSchema, [
    MARSHALLED_ERROR_SIGNATURE,
    {
      cause: value.cause,
      columnNumber: 'columnNumber' in value && typeof value.columnNumber === 'number' ? value.columnNumber : undefined,
      fileName: 'fileName' in value && typeof value.fileName === 'string' ? value.fileName : undefined,
      lineNumber: 'lineNumber' in value && typeof value.lineNumber === 'number' ? value.lineNumber : undefined,
      message: value.message,
      name: value.message,
      stack: value.stack
    }
  ] satisfies MarshalledError);
}

function unmarshalError(value: MarshalledError): Error {
  const [_, serializedError] = parse(marshalledErrorSchema, value);

  const error: ExtendedError = new Error(serializedError.message, {
    cause: serializedError.cause
  }) satisfies Error as ExtendedError;

  error.name = serializedError.name;

  if (typeof serializedError.stack === 'string') {
    error.stack = serializedError.stack;
  }

  if (typeof serializedError.columnNumber === 'number') {
    error.columnNumber = serializedError.columnNumber;
  }

  if (typeof serializedError.fileName === 'string') {
    error.fileName = serializedError.fileName;
  }

  if (typeof serializedError.lineNumber === 'number') {
    error.lineNumber = serializedError.lineNumber;
  }

  return error;
}

export { isMarshalledError, marshalError, marshalledErrorSchema, unmarshalError };
export type { MarshalledError };
