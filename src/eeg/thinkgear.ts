// Streaming parser for NeuroSky ThinkGear packets (used by BrainLink-Lite).
// Packet: 0xAA 0xAA <plength> <payload...> <checksum>, checksum = ~(sum of payload) & 0xFF.

export type BandPowers = [number, number, number, number, number, number, number, number];

export type ThinkGearHandlers = {
  onPoorSignal?: (v: number) => void;
  onAttention?: (v: number) => void;
  onMeditation?: (v: number) => void;
  onBlink?: (v: number) => void;
  onRaw?: (v: number) => void;
  onBands?: (b: BandPowers) => void;
};

const enum S {
  Sync1,
  Sync2,
  Length,
  Payload,
  Checksum,
}

export class ThinkGearParser {
  private state = S.Sync1;
  private len = 0;
  private payload = new Uint8Array(170);
  private idx = 0;
  private sum = 0;
  packets = 0;
  badChecksums = 0;

  constructor(private h: ThinkGearHandlers) {}

  push(bytes: Uint8Array) {
    for (let i = 0; i < bytes.length; i++) this.byte(bytes[i]);
  }

  private byte(b: number) {
    switch (this.state) {
      case S.Sync1:
        if (b === 0xaa) this.state = S.Sync2;
        break;
      case S.Sync2:
        this.state = b === 0xaa ? S.Length : S.Sync1;
        break;
      case S.Length:
        if (b === 0xaa) break; // extra sync byte, stay here
        if (b > 169) {
          this.state = S.Sync1;
          break;
        }
        this.len = b;
        this.idx = 0;
        this.sum = 0;
        this.state = b === 0 ? S.Checksum : S.Payload;
        break;
      case S.Payload:
        this.payload[this.idx++] = b;
        this.sum = (this.sum + b) & 0xff;
        if (this.idx >= this.len) this.state = S.Checksum;
        break;
      case S.Checksum:
        if ((~this.sum & 0xff) === b) {
          this.packets++;
          this.parsePayload();
        } else {
          this.badChecksums++;
        }
        this.state = S.Sync1;
        break;
    }
  }

  private parsePayload() {
    const p = this.payload;
    let i = 0;
    while (i < this.len) {
      while (p[i] === 0x55 && i < this.len) i++; // extended code level, unused
      const code = p[i++];
      if (code >= 0x80) {
        const vlen = p[i++];
        if (code === 0x80 && vlen === 2) {
          let v = (p[i] << 8) | p[i + 1];
          if (v >= 32768) v -= 65536;
          this.h.onRaw?.(v);
        } else if (code === 0x83 && vlen === 24) {
          const b = new Array(8) as unknown as BandPowers;
          for (let k = 0; k < 8; k++) {
            const o = i + k * 3;
            b[k] = (p[o] << 16) | (p[o + 1] << 8) | p[o + 2];
          }
          this.h.onBands?.(b);
        }
        i += vlen;
      } else {
        const v = p[i++];
        if (code === 0x02) this.h.onPoorSignal?.(v);
        else if (code === 0x04) this.h.onAttention?.(v);
        else if (code === 0x05) this.h.onMeditation?.(v);
        else if (code === 0x16) this.h.onBlink?.(v);
      }
    }
  }
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
