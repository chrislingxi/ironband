declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): Uint8Array & {
    equals(other: Uint8Array): boolean;
    readUInt32BE(offset: number): number;
  };
  export function statSync(path: string): { size: number };
}
