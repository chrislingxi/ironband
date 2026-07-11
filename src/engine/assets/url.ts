// Static assets live outside Vite's hashed JS bundle. Carry the page release token
// into every asset URL so GitHub Pages and iOS Safari cannot mix old art with new code.
export const ASSET_REVISION = '20260711-v4-release-candidate';

export function assetUrl(path: string): string {
  const pageRevision = typeof location === 'undefined'
    ? ''
    : new URLSearchParams(location.search).get('v')?.trim() ?? '';
  const revision = pageRevision || ASSET_REVISION;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${encodeURIComponent(revision)}`;
}
