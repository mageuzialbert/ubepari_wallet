import "server-only";

// Minimal ZIP writer — STORE (no compression) only. Good enough for a handful
// of small JSON files in an account data export. No runtime dependencies.
//
// Reference: PKWARE APPNOTE.TXT — local file header (0x04034b50), central
// directory header (0x02014b50), end of central directory (0x06054b50).

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// MS-DOS time/date format — seconds divided by 2, starting from 1980.
function dosTime(d: Date): { time: number; date: number } {
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date =
    ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export type ZipEntry = { path: string; data: Uint8Array | string };

export function buildZip(entries: ZipEntry[], modified: Date = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const { time, date } = dosTime(modified);

  type Prepared = {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    localHeaderOffset: number;
  };

  const prepared: Prepared[] = [];
  let offset = 0;
  const localChunks: Uint8Array[] = [];

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.path);
    const dataBytes =
      typeof entry.data === "string" ? enc.encode(entry.data) : entry.data;
    const crc = crc32(dataBytes);

    const header = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(header.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); // version needed
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // compression = store
    dv.setUint16(10, time, true);
    dv.setUint16(12, date, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, dataBytes.length, true); // compressed size
    dv.setUint32(22, dataBytes.length, true); // uncompressed size
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true); // extra length
    header.set(nameBytes, 30);

    prepared.push({ nameBytes, dataBytes, crc, localHeaderOffset: offset });
    localChunks.push(header, dataBytes);
    offset += header.length + dataBytes.length;
  }

  const centralChunks: Uint8Array[] = [];
  const centralStart = offset;
  let centralSize = 0;

  for (const p of prepared) {
    const header = new Uint8Array(46 + p.nameBytes.length);
    const dv = new DataView(header.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true); // version made by
    dv.setUint16(6, 20, true); // version needed
    dv.setUint16(8, 0, true); // flags
    dv.setUint16(10, 0, true); // compression = store
    dv.setUint16(12, time, true);
    dv.setUint16(14, date, true);
    dv.setUint32(16, p.crc, true);
    dv.setUint32(20, p.dataBytes.length, true);
    dv.setUint32(24, p.dataBytes.length, true);
    dv.setUint16(28, p.nameBytes.length, true);
    dv.setUint16(30, 0, true); // extra
    dv.setUint16(32, 0, true); // comment
    dv.setUint16(34, 0, true); // disk number
    dv.setUint16(36, 0, true); // internal attrs
    dv.setUint32(38, 0, true); // external attrs
    dv.setUint32(42, p.localHeaderOffset, true);
    header.set(p.nameBytes, 46);

    centralChunks.push(header);
    centralSize += header.length;
  }

  const eocd = new Uint8Array(22);
  const dv = new DataView(eocd.buffer);
  dv.setUint32(0, 0x06054b50, true);
  dv.setUint16(4, 0, true); // disk number
  dv.setUint16(6, 0, true); // disk with CD start
  dv.setUint16(8, prepared.length, true); // entries on disk
  dv.setUint16(10, prepared.length, true); // total entries
  dv.setUint32(12, centralSize, true);
  dv.setUint32(16, centralStart, true);
  dv.setUint16(20, 0, true); // comment length

  const totalSize = centralStart + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let cursor = 0;
  for (const chunk of localChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  for (const chunk of centralChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  out.set(eocd, cursor);
  return out;
}

export function zipResponse(filename: string, bytes: Uint8Array): Response {
  const body = new Uint8Array(bytes);
  return new Response(body, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "content-length": String(body.length),
      "cache-control": "no-store",
    },
  });
}
