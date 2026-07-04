declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function statSync(path: string): { size: number };
}
