import fs from "node:fs";

export function readTextFile(filePath: string): string {
  return decodeTextBuffer(fs.readFileSync(filePath));
}

export function decodeTextBuffer(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString("utf8");
  }

  if (looksLikeUtf16Le(buffer)) {
    return buffer.toString("utf16le").replace(/^\uFEFF/u, "");
  }

  return buffer.toString("utf8").replace(/^\uFEFF/u, "");
}

function looksLikeUtf16Le(buffer: Buffer): boolean {
  const sampleLength = Math.min(buffer.length, 128);
  let asciiEvenBytes = 0;
  let nullOddBytes = 0;

  for (let index = 0; index + 1 < sampleLength; index += 2) {
    const evenByte = buffer[index];
    const oddByte = buffer[index + 1];
    if (evenByte >= 0x20 && evenByte <= 0x7e) {
      asciiEvenBytes += 1;
    }
    if (oddByte === 0x00) {
      nullOddBytes += 1;
    }
  }

  return asciiEvenBytes >= 2 && nullOddBytes >= 4;
}
