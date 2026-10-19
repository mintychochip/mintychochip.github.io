/** Small wire-format helpers shared by the article's interactive panels. */

export interface ByteRow {
  offset: number;
  bytes: number[];
}

export interface SourceLocation {
  line: number;
  column: number;
  text: string;
}

export interface VarintByte {
  index: number;
  value: number;
  payload: number;
  continuation: boolean;
}

/** Strip the separators people paste from terminals and logs. */
export function normalizeHex(input: string): string {
  const clean = input.replace(/0x/gi, '').replace(/[\s,_:\-]/g, '').toLowerCase();
  if (clean.length % 2 !== 0) throw new Error('hex needs an even number of digits');
  if (/[^0-9a-f]/.test(clean)) throw new Error('hex contains a non-hexadecimal character');
  return clean;
}

export function parseBytes(input: string): number[] {
  const hex = normalizeHex(input);
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(Number.parseInt(hex.slice(i, i + 2), 16));
  return bytes;
}

export function toHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function byteRows(input: string, perRow = 16): ByteRow[] {
  const bytes = parseBytes(input);
  const rows: ByteRow[] = [];
  for (let i = 0; i < bytes.length; i += perRow) {
    rows.push({ offset: i, bytes: bytes.slice(i, i + perRow) });
  }
  return rows;
}

/** Resolve a parser/interpreter offset into a 1-based line and column. */
export function locateOffset(source: string, offset: number): SourceLocation {
  const bounded = Math.max(0, Math.min(offset, source.length));
  const before = source.slice(0, bounded);
  const line = before.split('\n').length;
  const column = bounded - before.lastIndexOf('\n');
  const text = source.split('\n')[line - 1] ?? '';
  return { line, column, text };
}

/** Break a VarInt's bytes into their 7-bit groups and continuation bits. */
export function varintBytes(bytes: number[]): VarintByte[] {
  return bytes.map((value, index) => ({
    index,
    value,
    payload: value & 0x7f,
    continuation: (value & 0x80) !== 0,
  }));
}

export function binary(value: number, width = 8): string {
  return value.toString(2).padStart(width, '0');
}
