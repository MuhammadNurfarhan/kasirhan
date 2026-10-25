declare module 'upng-js' {
  export interface Image {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: any[];
    data: ArrayBuffer;
  }
  export function decode(buffer: ArrayBuffer | Uint8Array | Buffer): Image;
  export function toRGBA8(out: Image): ArrayBuffer[];
  export function encode(
    bufs: ArrayBuffer[],
    w: number,
    h: number,
    cnum: number,
    dels?: number[]
  ): ArrayBuffer;
}

declare module 'jpeg-js' {
  export interface RawImageData<T> {
    width: number;
    height: number;
    data: T;
  }
  export function decode(
    jpegData: Buffer | Uint8Array,
    options?: { useTArray?: boolean; colorTransform?: boolean }
  ): RawImageData<Uint8Array>;
}
