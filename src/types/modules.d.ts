declare module 'pngjs' {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };
  }
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

