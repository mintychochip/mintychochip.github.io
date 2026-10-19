/** Sample frames from the demo schema, used by the Three.js wire visual.
 *
 * Each frame is `[length][id][payload]`, where the length counts the id byte
 * and the payload (the demo protocol's `frame default` layout). The payloads
 * are the encoder's output for the sample values in `schemas.ts`.
 */

export interface WireSample {
  packet: string;
  hex: string;
  id: number;
  length: number;
  payloadBytes: number;
}

export const WIRE_SAMPLES: WireSample[] = [
  {
    packet: 'player_chat',
    hex: '21010f68656c6c6f2c20627974656d696c6c00000000000000010000000000000000',
    id: 1,
    length: 33,
    payloadBytes: 32,
  },
  {
    packet: 'move_entity',
    hex: '09022a0001fffe000301',
    id: 2,
    length: 9,
    payloadBytes: 8,
  },
  {
    packet: 'metadata',
    hex: '0c032a0208627974656d696c6c',
    id: 3,
    length: 12,
    payloadBytes: 11,
  },
  {
    packet: 'block_update',
    hex: '0a04000000000000000007',
    id: 4,
    length: 10,
    payloadBytes: 9,
  },
];
