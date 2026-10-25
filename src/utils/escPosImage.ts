import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import * as UPNG from 'upng-js';
import * as jpeg from 'jpeg-js';

export interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

/**
 * Decode image file (PNG, JPG/JPEG) into raw RGBA buffer
 */
export async function decodeImageToRgba(uri: string): Promise<DecodedImage | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return null;

    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // 1. Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
    if (
      fileBuffer.length > 8 &&
      fileBuffer[0] === 0x89 &&
      fileBuffer[1] === 0x50 &&
      fileBuffer[2] === 0x4e &&
      fileBuffer[3] === 0x47
    ) {
      const img = UPNG.decode(fileBuffer);
      const rgba8 = UPNG.toRGBA8(img)[0];
      return {
        width: img.width,
        height: img.height,
        data: new Uint8Array(rgba8),
      };
    }

    // 2. Check JPEG signature (FF D8 FF)
    if (
      fileBuffer.length > 3 &&
      fileBuffer[0] === 0xff &&
      fileBuffer[1] === 0xd8 &&
      fileBuffer[2] === 0xff
    ) {
      const decodedJpeg = jpeg.decode(fileBuffer, { useTArray: true });
      return {
        width: decodedJpeg.width,
        height: decodedJpeg.height,
        data: decodedJpeg.data,
      };
    }

    // Fallback: coba PNG dulu, lalu JPEG
    try {
      const img = UPNG.decode(fileBuffer);
      const rgba8 = UPNG.toRGBA8(img)[0];
      return {
        width: img.width,
        height: img.height,
        data: new Uint8Array(rgba8),
      };
    } catch {
      const decodedJpeg = jpeg.decode(fileBuffer, { useTArray: true });
      return {
        width: decodedJpeg.width,
        height: decodedJpeg.height,
        data: decodedJpeg.data,
      };
    }
  } catch (err) {
    console.warn('Gagal membaca/mendekode gambar logo untuk printer thermal:', err);
    return null;
  }
}

/**
 * Bilinear / nearest-neighbor resize of raw RGBA buffer
 */
export function resizeRgba(
  srcData: Uint8Array | Buffer,
  srcW: number,
  srcH: number,
  destW: number,
  destH: number
): Uint8Array {
  const destData = new Uint8Array(destW * destH * 4);
  const xRatio = srcW / destW;
  const yRatio = srcH / destH;

  for (let dy = 0; dy < destH; dy++) {
    const sy = Math.min(Math.floor(dy * yRatio), srcH - 1);
    for (let dx = 0; dx < destW; dx++) {
      const sx = Math.min(Math.floor(dx * xRatio), srcW - 1);
      const srcIdx = (sy * srcW + sx) * 4;
      const destIdx = (dy * destW + dx) * 4;
      destData[destIdx] = srcData[srcIdx];
      destData[destIdx + 1] = srcData[srcIdx + 1];
      destData[destIdx + 2] = srcData[srcIdx + 2];
      destData[destIdx + 3] = srcData[srcIdx + 3];
    }
  }

  return destData;
}

/**
 * Convert RGBA buffer to ESC/POS Raster bit-image Buffer (GS v 0) with Floyd-Steinberg dithering.
 * Target width default: 200 dots (center-aligned on 384-dot 58mm printer roll).
 */
export function convertRgbaToEscPosRaster(
  rgbaData: Uint8Array | Buffer,
  srcW: number,
  srcH: number,
  maxDotsWidth: number = 200
): Buffer {
  // Hitung aspect ratio dan target size (lebar wajib kelipatan 8 dots untuk ESC/POS)
  let targetW = Math.min(srcW, maxDotsWidth);
  targetW = Math.max(16, Math.floor(targetW / 8) * 8); // kelipatan 8
  const scale = targetW / srcW;
  const targetH = Math.max(16, Math.round(srcH * scale));

  // Resize RGBA
  const resized = resizeRgba(rgbaData, srcW, srcH, targetW, targetH);

  // Buat grayscale float array (0.0 = hitam, 255.0 = putih)
  const gray = new Float32Array(targetW * targetH);
  for (let i = 0; i < targetW * targetH; i++) {
    const r = resized[i * 4];
    const g = resized[i * 4 + 1];
    const b = resized[i * 4 + 2];
    const a = resized[i * 4 + 3];

    // Transparansi (alpha) dianggap latar belakang putih
    if (a < 128) {
      gray[i] = 255.0;
    } else {
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  // Floyd-Steinberg error diffusion dithering ke 1-bit bitmap
  const bytesPerLine = targetW / 8;
  const bitmapData = Buffer.alloc(bytesPerLine * targetH);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = y * targetW + x;
      const oldVal = gray[idx];
      const newVal = oldVal < 128 ? 0 : 255;
      const err = oldVal - newVal;

      // 1 = hitam (titik bakar thermal), 0 = putih
      if (newVal === 0) {
        const byteIdx = y * bytesPerLine + (x >> 3);
        bitmapData[byteIdx] |= 0x80 >> (x & 7);
      }

      // Distribusi error dithering ke piksel tetangga
      if (x + 1 < targetW) gray[idx + 1] += (err * 7) / 16;
      if (x - 1 >= 0 && y + 1 < targetH) gray[(y + 1) * targetW + (x - 1)] += (err * 3) / 16;
      if (y + 1 < targetH) gray[(y + 1) * targetW + x] += (err * 5) / 16;
      if (x + 1 < targetW && y + 1 < targetH) gray[(y + 1) * targetW + (x + 1)] += (err * 1) / 16;
    }
  }

  // Format ESC/POS GS v 0 m xL xH yL yH [data]
  // GS v 0 0: m = 0 (Normal mode)
  const xL = bytesPerLine & 0xff;
  const xH = (bytesPerLine >> 8) & 0xff;
  const yL = targetH & 0xff;
  const yH = (targetH >> 8) & 0xff;

  const ALIGN_CENTER = Buffer.from([0x1b, 0x61, 0x01]);
  const GS_V_0_HEADER = Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  const POST_FEED = Buffer.from('\n');

  return Buffer.concat([ALIGN_CENTER, GS_V_0_HEADER, bitmapData, POST_FEED]);
}

/**
 * Helper all-in-one: Ambil file gambar dari URI dan jadikan Buffer ESC/POS
 */
export async function getLogoEscPosBuffer(
  logoUri: string | null,
  paperSize: '58mm' | '80mm' = '58mm'
): Promise<Buffer | null> {
  if (!logoUri) return null;
  const decoded = await decodeImageToRgba(logoUri);
  if (!decoded) return null;

  // Untuk 58mm: max 200 dots (lebar kertas total 384 dots)
  // Untuk 80mm: max 280 dots (lebar kertas total 576 dots)
  const maxDots = paperSize === '80mm' ? 280 : 200;
  return convertRgbaToEscPosRaster(decoded.data, decoded.width, decoded.height, maxDots);
}
