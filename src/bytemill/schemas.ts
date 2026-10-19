/** Self-contained BML sources used by the article's interactive labs.
 *
 * The browser bridge intentionally does not read imported files, so every
 * preset declares its own primitives. The default preset mirrors the shapes
 * the bytemill README uses: VarInt, length-prefixed UTF-8, a bit-packed
 * position, a tagged union, arrays, and a routed frame.
 */

export interface SchemaPreset {
  id: string;
  label: string;
  note: string;
  source: string;
}

const VARINT = `encoding varint = {
    b0: u8 = ((value & 0xFFFFFFFF) & 0x7F) | ((((value & 0xFFFFFFFF) >> 7) != 0) ? 0x80 : 0)
    b1: u8 if (b0 & 0x80) != 0 = (((value & 0xFFFFFFFF) >> 7) & 0x7F) | ((((value & 0xFFFFFFFF) >> 14) != 0) ? 0x80 : 0)
    b2: u8 if (b1 & 0x80) != 0 = (((value & 0xFFFFFFFF) >> 14) & 0x7F) | ((((value & 0xFFFFFFFF) >> 21) != 0) ? 0x80 : 0)
    b3: u8 if (b2 & 0x80) != 0 = (((value & 0xFFFFFFFF) >> 21) & 0x7F) | ((((value & 0xFFFFFFFF) >> 28) != 0) ? 0x80 : 0)
    b4: u8 if (b3 & 0x80) != 0 = ((value & 0xFFFFFFFF) >> 28) & 0x0F
    require (b4 & 0x80) == 0
} = sign_extend((b0 & 0x7F) | ((b1 & 0x7F) << 7) | ((b2 & 0x7F) << 14) | ((b3 & 0x7F) << 21) | ((b4 & 0x0F) << 28), 32)`;

const U16BE = `encoding u16be = {
    b0: u8 = (value >> 8) & 0xFF
    b1: u8 = value & 0xFF
} = (b0 << 8) | b1`;

const U64BE = `encoding u64be = {
    b0: u8 = (value >> 56) & 0xFF
    b1: u8 = (value >> 48) & 0xFF
    b2: u8 = (value >> 40) & 0xFF
    b3: u8 = (value >> 32) & 0xFF
    b4: u8 = (value >> 24) & 0xFF
    b5: u8 = (value >> 16) & 0xFF
    b6: u8 = (value >> 8) & 0xFF
    b7: u8 = value & 0xFF
} = (b0 << 56) | (b1 << 48) | (b2 << 40) | (b3 << 32) | (b4 << 24) | (b5 << 16) | (b6 << 8) | b7`;

const STRING = `encoding string(max_chars = 32767) = {
    byte_len: varint
    value: bytes(byte_len) as utf8
    require utf16_units(value) <= max_chars
}`;

const POSITION = `encoding position = {
    raw: u64be
    x = sign_extend(raw >> 38, 26)
    y = sign_extend(raw % 4096, 12)
    z = sign_extend((raw >> 12) % 67108864, 26)
}`;

const BOOLEAN = `encoding boolean = {
    raw: u8 = value ? 1 : 0
} = raw != 0`;

const CHAT_SCHEMA = `// A compact BML schema. Everything is declared here so the browser
// bridge can check it without a filesystem.

// VarInt: seven payload bits per byte, high bit means "another byte".
${VARINT}

${U16BE}

encoding i16be = {
    raw: u16be = value & 0xFFFF
} = sign_extend(raw, 16)

${U64BE}

${BOOLEAN}

// Length-prefixed UTF-8 with a code-point limit.
${STRING}

// Minecraft's bit-packed coordinate: 26 bits of x, 12 of y, 26 of z.
${POSITION}

packet player_chat {
    message: string(256)
    timestamp: u64be
    sender: position
}

packet move_entity {
    entity_id: varint
    dx: i16be
    dy: i16be
    dz: i16be
    on_ground: boolean
}

// The tag selects the layout of the value that follows.
packet metadata {
    entity_id: varint
    kind: varint
    value: match kind {
        0 => boolean
        1 => varint
        2 => string(64)
        _ => { raw: varint }
    }
}

packet block_update {
    position: position
    block_state: varint
}

// A frame is a schema too: length counts the id bytes and payload.
protocol demo @ v1 {
    id = 1
    frame default {
        length: varint
        id: varint
        payload: rest
    }
    route play.clientbound 0x01 => player_chat
    route play.clientbound 0x02 => move_entity
    route play.clientbound 0x03 => metadata
    route play.clientbound 0x04 => block_update
}`;

const UNION_SCHEMA = `// Tagged unions, arrays, and a declared enum.
${VARINT}

${STRING}

${BOOLEAN}

enum intent : varint {
    status = 1
    login = 2
    transfer = 3
}

packet handshake {
    protocol_version: varint
    server: string(255)
    // The enum documents intent; the wire field is still explicit.
    intent: varint
}

packet tagged {
    kind: varint
    value: match kind {
        0 => boolean
        1 => varint
        2 => string(64)
        _ => { raw: varint }
    }
}

packet slots {
    slots_count: varint
    slots: {
        item_id: varint
        count: u8
    }[] count = slots_count
}`;

const VARINT_SCHEMA = `// The smallest useful schema: one VarInt packet.
${VARINT}

packet echo {
    value: varint
}`;

export const PRESETS: SchemaPreset[] = [
  {
    id: 'chat',
    label: 'Chat + routing',
    note: 'VarInts, UTF-8, a bit-packed position, a tagged union, and four routed packets.',
    source: CHAT_SCHEMA,
  },
  {
    id: 'union',
    label: 'Tagged union + arrays',
    note: 'A match on a kind tag and a counted list of records.',
    source: UNION_SCHEMA,
  },
  {
    id: 'varint',
    label: 'VarInt echo',
    note: 'One encoding and one packet, for reading the wire format closely.',
    source: VARINT_SCHEMA,
  },
];

export { CHAT_SCHEMA, UNION_SCHEMA, VARINT_SCHEMA };

/** Values used to prefill the decoder and encoder for the default schema. */
export const SAMPLE_VALUES: Record<string, Record<string, unknown>> = {
  player_chat: { message: 'hello, bytemill', timestamp: 1, sender: { raw: 0 } },
  move_entity: { entity_id: 42, dx: 1, dy: -2, dz: 3, on_ground: true },
  metadata: { entity_id: 42, kind: 2, value: 'bytemill' },
  block_update: { position: { raw: 0 }, block_state: 7 },
  handshake: { protocol_version: 770, server: 'mc.example', intent: 2 },
  tagged: { kind: 2, value: 'hi' },
  slots: { slots_count: 2, slots: [{ item_id: 1, count: 3 }, { item_id: 5, count: 64 }] },
  echo: { value: 300 },
};
