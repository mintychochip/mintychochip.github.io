import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { BytemillError, instantiateBytemill, type Bytemill } from './wasm';
import { describeError } from './errors';
import { CHAT_SCHEMA, PRESETS, SAMPLE_VALUES, UNION_SCHEMA, VARINT_SCHEMA } from './schemas';
import { WIRE_SAMPLES } from './wire-frames';
import { locateOffset, normalizeHex, varintBytes } from './wire';

const FRAME =
  '21010f68656c6c6f2c20627974656d696c6c00000000000000010000000000000000';

let engine: Bytemill;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), 'public/blog/bytemill/bytemill.wasm'));
  engine = await instantiateBytemill(wasm);
});

describe('bytemill wasm bridge', () => {
  it('reports the engine version', () => {
    expect(engine.getVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('checks every preset and exposes packets and routes', () => {
    for (const preset of PRESETS) {
      const check = engine.check(preset.source);
      expect(check.packets.length).toBeGreaterThan(0);
      expect(check.encodings).toContain('varint');
    }

    const chat = engine.check(CHAT_SCHEMA);
    expect(chat.packets.map((packet) => packet.name)).toEqual([
      'player_chat',
      'move_entity',
      'metadata',
      'block_update',
    ]);
    expect(chat.routes).toHaveLength(4);
    expect(chat.routes.find((route) => route.id === 1)?.packet).toBe('player_chat');
    expect(chat.packets.find((packet) => packet.name === 'player_chat')?.fields).toEqual([
      'message',
      'timestamp',
      'sender',
    ]);
  });

  it('encodes and decodes a VarInt packet round trip', () => {
    const encoded = engine.encode(VARINT_SCHEMA, 'echo', { value: 300 });
    expect(encoded.hex).toBe('ac02');
    expect(encoded.fields).toEqual({ value: 300 });
    expect(encoded.roundtrip).toBe(true);

    const decoded = engine.decode(VARINT_SCHEMA, 'echo', 'ac02');
    expect(decoded.fields).toEqual({ value: 300 });
    expect(decoded.reencoded).toBe('ac02');
  });

  it('writes the two\u2019s-complement form for negative VarInts', () => {
    expect(engine.encode(VARINT_SCHEMA, 'echo', { value: -1 }).hex).toBe('ffffffff0f');
  });

  it('encodes every sample for the default schema and round trips it', () => {
    const expected: Record<string, string> = {
      player_chat: '0f68656c6c6f2c20627974656d696c6c00000000000000010000000000000000',
      move_entity: '2a0001fffe000301',
      metadata: '2a0208627974656d696c6c',
      block_update: '000000000000000007',
    };

    for (const [packet, value] of Object.entries(SAMPLE_VALUES)) {
      if (!(packet in expected)) continue;
      const encoded = engine.encode(CHAT_SCHEMA, packet, value);
      expect(encoded.hex, packet).toBe(expected[packet]);
      expect(encoded.roundtrip, packet).toBe(true);
      const decoded = engine.decode(CHAT_SCHEMA, packet, encoded.hex);
      expect(decoded.roundtrip, packet).toBe(true);
    }
  });

  it('decodes every frame used by the Three.js visual', () => {
    for (const sample of WIRE_SAMPLES) {
      const bytes = sample.hex.length / 2;
      expect(sample.length, sample.packet).toBe(bytes - 1);
      expect(sample.payloadBytes, sample.packet).toBe(sample.length - 1);

      const decoded = engine.decodeFrame(CHAT_SCHEMA, 'play', 'clientbound', sample.hex);
      expect(decoded.id, sample.packet).toBe(sample.id);
      expect(decoded.packet, sample.packet).toBe(sample.packet);
      expect(decoded.bytes, sample.packet).toBe(bytes);
      expect(decoded.hex, sample.packet).toBe(sample.hex);
    }
  });

  it('decodes a whole frame and routes its id to a packet', () => {
    const decoded = engine.decodeFrame(CHAT_SCHEMA, 'play', 'clientbound', FRAME);
    expect(decoded.id).toBe(1);
    expect(decoded.packet).toBe('player_chat');
    expect(decoded.fields).toMatchObject({ message: 'hello, bytemill', timestamp: 1 });
    expect(decoded.bytes).toBe(34);
  });

  it('rejects trailing bytes in strict packet mode', () => {
    expect(() => engine.decode(CHAT_SCHEMA, 'move_entity', '2a0001fffe00030100')).toThrowError(
      BytemillError,
    );
  });

  it('keeps schema offsets and wire offsets distinct', () => {
    const parse = new BytemillError('ParseError', 'bad token', 4);
    expect(describeError(parse, 'a\nbc\ndef')).toMatchObject({
      location: { line: 2, column: 3, text: 'bc' },
      wireOffset: null,
    });

    const decode = new BytemillError('DecodeError', 'short read', 4);
    expect(describeError(decode, 'a\nbc\ndef')).toMatchObject({
      location: null,
      wireOffset: 4,
    });
  });

  it('surfaces parser errors with a source offset', () => {
    try {
      engine.check('packet broken {');
      throw new Error('expected the schema to fail');
    } catch (cause) {
      expect(cause).toBeInstanceOf(BytemillError);
      const error = cause as BytemillError;
      expect(error.kind).toBe('ParseError');
      expect(error.offset).not.toBeNull();
      const location = locateOffset('packet broken {', error.offset ?? 0);
      expect(location.line).toBe(1);
    }
  });

  it('rejects imports with a playground-specific message', () => {
    try {
      engine.check('import "std/varint.bml"');
      throw new Error('expected the schema to fail');
    } catch (cause) {
      expect(cause).toBeInstanceOf(BytemillError);
      expect((cause as BytemillError).message).toMatch(/imports are not available/);
    }
  });

  it('returns the compiler compatibility matrix', () => {
    const matrix = engine.targets();
    expect(matrix.length).toBeGreaterThanOrEqual(9);
    for (const entry of matrix) {
      expect(entry.versions.length, entry.target).toBeGreaterThan(0);
      expect(entry.versions, entry.target).toContain(entry.default);
    }
    const byTarget = new Map(matrix.map((entry) => [entry.target, entry]));
    expect(byTarget.get('cpp')?.default).toBe('C++20');
    expect(byTarget.get('go')?.versions).toContain('1.24');
    expect(engine.bytes).toBeGreaterThan(100_000);
  });

  it('exposes syntax, semantic, lowered, and typed compiler phases', () => {
    const phases = engine.stages(CHAT_SCHEMA);
    expect(phases.syntax.declarations.some((item) => item.name === 'player_chat')).toBe(true);
    expect(phases.semantic.packets).toContain('player_chat');
    expect(phases.semantic.routes).toHaveLength(4);
    expect(phases.lowered.types.find((item) => item.name === 'position')?.kind).toBe('record');
    expect(phases.lowered.frames.find((item) => item.name === 'default')?.type_id).toBe(
      'frame_default',
    );
    expect(phases.typed.codecs.find((item) => item.name === 'player_chat')?.kind).toBe('record');
    expect(phases.typed.routes[0].packet).toBe('player_chat');
  });

  it('checks the union preset with a counted list', () => {
    const check = engine.check(UNION_SCHEMA);
    expect(check.packets.map((packet) => packet.name)).toContain('slots');
    const encoded = engine.encode(UNION_SCHEMA, 'slots', {
      slots_count: 2,
      slots: [
        { item_id: 1, count: 3 },
        { item_id: 5, count: 64 },
      ],
    });
    expect(encoded.hex).toBe('0201030540');
    expect(encoded.roundtrip).toBe(true);
  });
});

describe('wire helpers', () => {
  it('normalises pasted hex', () => {
    expect(normalizeHex('0x02 68:69, 0a_0B')).toBe('0268690a0b');
    expect(() => normalizeHex('abc')).toThrow(/even number/);
    expect(() => normalizeHex('zz')).toThrow(/non-hexadecimal/);
  });

  it('locates an offset in a schema', () => {
    expect(locateOffset('a\nbc\ndef', 3)).toEqual({ line: 2, column: 2, text: 'bc' });
  });

  it('splits VarInt bytes into payloads and continuation bits', () => {
    expect(varintBytes([0xac, 0x02])).toEqual([
      { index: 0, value: 0xac, payload: 0x2c, continuation: true },
      { index: 1, value: 0x02, payload: 0x02, continuation: false },
    ]);
  });
});
