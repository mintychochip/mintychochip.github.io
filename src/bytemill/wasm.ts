/** Client for the bytemill WebAssembly bridge.
 *
 * The bridge is `crates/bytemill-wasm` in the bytemill repository. It exports a
 * tiny ABI: allocate a request buffer, run one JSON request, read a
 * length-prefixed JSON response. No server is involved; the same Rust parser,
 * analyzer, and interpreter as the `bml` CLI run in the page.
 */

export interface PacketInfo {
  name: string;
  fields: string[];
}

export interface EnumInfo {
  name: string;
  members: string[];
}

export interface ProtocolInfo {
  name: string;
  version: string;
  id: number;
  frames: string[];
}

export interface RouteInfo {
  state: string;
  direction: string;
  id: number;
  packet: string;
}

export interface CheckData {
  packets: PacketInfo[];
  encodings: string[];
  enums: EnumInfo[];
  protocols: ProtocolInfo[];
  routes: RouteInfo[];
}

export interface DecodeData {
  packet: string;
  fields: Record<string, unknown>;
  bytes: number;
  hex: string;
  reencoded?: string;
  roundtrip?: boolean;
  id?: number;
}

export interface EncodeData {
  packet: string;
  fields: Record<string, unknown>;
  bytes: number;
  hex: string;
  roundtrip: boolean;
}

export interface StageRoute {
  state: string;
  direction: string;
  id: number;
  packet: string;
  frame: string | null;
}

export interface StageDeclaration {
  kind: string;
  name: string;
}

export interface SyntaxStage {
  imports: string[];
  declarations: StageDeclaration[];
}

export interface SemanticStage {
  encodings: string[];
  enums: string[];
  packets: string[];
  protocols: string[];
  routes: StageRoute[];
}

export interface LoweredType {
  name: string;
  kind: string;
}

export interface StageProcedure {
  name: string;
  params: string[];
  returns: boolean;
}

export interface LoweredFrame {
  name: string;
  type_id: string;
  decode: string;
  encode: string;
}

export interface LoweredStage {
  types: LoweredType[];
  decode: StageProcedure[];
  encode: StageProcedure[];
  frames: LoweredFrame[];
  routes: StageRoute[];
}

export interface TypedType {
  name: string;
  ir: string;
  kind: string;
  codec: string | null;
}

export interface TypedCodec {
  name: string;
  ir: string;
  kind: string;
  value: string;
  params: string[];
  locals: number;
  statements: number;
}

export interface TypedStage {
  types: TypedType[];
  codecs: TypedCodec[];
  routes: StageRoute[];
}

export interface TargetCompat {
  target: string;
  language: string;
  default: string;
  versions: string[];
}

export interface StageData {
  syntax: SyntaxStage;
  semantic: SemanticStage;
  lowered: LoweredStage;
  typed: TypedStage;
}

interface BridgeExports {
  memory: WebAssembly.Memory;
  bml_alloc(len: number): number;
  bml_free(ptr: number, len: number): void;
  bml_run(ptr: number, len: number): number;
  bml_response_len(ptr: number): number;
  bml_free_response(ptr: number): void;
}

interface OkResponse<T> {
  ok: true;
  data: T;
}

interface ErrorResponse {
  ok: false;
  error: {
    kind: string;
    offset: number | null;
    message: string;
  };
}

type Response<T> = OkResponse<T> | ErrorResponse;

export class BytemillError extends Error {
  readonly kind: string;
  readonly offset: number | null;

  constructor(kind: string, message: string, offset: number | null = null) {
    super(message);
    this.name = 'BytemillError';
    this.kind = kind;
    this.offset = offset;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class Bytemill {
  private readonly bridge: BridgeExports;
  version = '';
  /** Size of the loaded wasm module, in bytes. */
  bytes = 0;

  constructor(bridge: BridgeExports) {
    this.bridge = bridge;
  }

  private call<T>(request: Record<string, unknown>): T {
    const bytes = encoder.encode(JSON.stringify(request));
    const requestPtr = this.bridge.bml_alloc(bytes.length);
    if (!requestPtr) throw new BytemillError('BridgeError', 'could not allocate request memory');

    let responsePtr = 0;
    try {
      new Uint8Array(this.bridge.memory.buffer, requestPtr, bytes.length).set(bytes);
      responsePtr = this.bridge.bml_run(requestPtr, bytes.length);
      if (!responsePtr) throw new BytemillError('BridgeError', 'the compiler returned no response');

      const length = this.bridge.bml_response_len(responsePtr);
      const text = decoder.decode(
        new Uint8Array(this.bridge.memory.buffer, responsePtr + 4, length),
      );
      const response = JSON.parse(text) as Response<T>;
      if (!response.ok) {
        throw new BytemillError(
          response.error.kind,
          response.error.message,
          response.error.offset,
        );
      }
      return response.data;
    } finally {
      if (responsePtr) this.bridge.bml_free_response(responsePtr);
      this.bridge.bml_free(requestPtr, bytes.length);
    }
  }

  /** Parse, resolve, and analyze a self-contained schema. */
  check(source: string): CheckData {
    return this.call<CheckData>({ op: 'check', source });
  }

  /** Decode one packet payload from hex. */
  decode(source: string, packet: string, hex: string): DecodeData {
    return this.call<DecodeData>({ op: 'decode', source, packet, hex });
  }

  /** Decode a whole frame and route its id to a packet. */
  decodeFrame(source: string, state: string, direction: string, hex: string): DecodeData {
    return this.call<DecodeData>({ op: 'decode', source, state, direction, hex });
  }

  /** Encode one packet payload from a JSON value. */
  encode(source: string, packet: string, value: Record<string, unknown>): EncodeData {
    return this.call<EncodeData>({ op: 'encode', source, packet, value });
  }

  /** Inspect syntax, semantic, lowered, and typed compiler phases. */
  stages(source: string): StageData {
    return this.call<StageData>({ op: 'stages', source });
  }

  /** The compiler's compatibility matrix: targets, defaults, and standards. */
  targets(): TargetCompat[] {
    return this.call<TargetCompat[]>({ op: 'targets' });
  }

  getVersion(): string {
    const data = this.call<{ engine: string; version: string }>({ op: 'version' });
    this.version = data.version;
    return data.version;
  }
}

export async function instantiateBytemill(bytes: BufferSource): Promise<Bytemill> {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const engine = new Bytemill(instance.exports as unknown as BridgeExports);
  engine.bytes = bytes.byteLength;
  return engine;
}

let pending: Promise<Bytemill> | undefined;

/** Load the bridge once per page and share it across every widget. */
export function getBytemill(): Promise<Bytemill> {
  pending ??= (async () => {
    const response = await fetch('/bytemill/bytemill.wasm');
    if (!response.ok) {
      throw new Error(`could not load the bytemill WebAssembly build (${response.status})`);
    }
    const engine = await instantiateBytemill(await response.arrayBuffer());
    engine.getVersion();
    return engine;
  })();
  return pending;
}
