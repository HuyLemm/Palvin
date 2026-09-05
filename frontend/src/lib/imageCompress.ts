// Every photo upload in the app (posts, memories, wishes, favourite places,
// our places, chat photos, avatars) went straight from the picked File to
// Storage at whatever resolution the camera produced it — often 10-40MP —
// even though everywhere it's displayed is a feed card, thumbnail, or small
// avatar. Downscaling + re-encoding here, once, before the upload call,
// cuts that data cost (both the one-time upload and every later view/download)
// without touching any of the many call sites' own logic.
const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;
// Below this there's nothing worth reclaiming — re-encoding a file that's
// already small can occasionally come out larger (recompression artifacts,
// a source format denser than JPEG at this quality), so skip it entirely.
const SKIP_BELOW_BYTES = 700_000;

export interface CompressedImage {
  blob: Blob | File;
  ext: string;
}

// GIFs would lose their animation if re-encoded as a single JPEG frame, and
// SVGs are vector (already tiny, resolution-independent) — both pass through
// untouched.
const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml']);

// Takes File | Blob (not just File) so callers that share one upload
// helper between photos and other media — chat's voice messages, e.g. —
// can run every upload through this unconditionally: anything whose
// `type` isn't an image/* passes through untouched.
export async function compressImage(
  file: File | Blob,
  originalExt: string,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY,
): Promise<CompressedImage> {
  const fallback: CompressedImage = { blob: file, ext: originalExt };
  if (!file.type.startsWith('image/') || SKIP_TYPES.has(file.type)) return fallback;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < SKIP_BELOW_BYTES) {
      bitmap.close();
      return fallback;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return fallback; }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return fallback;
    return { blob, ext: 'jpg' };
  } catch {
    // Decoding failed (corrupt file, an image type this browser can't
    // decode, ...) — upload the original rather than blocking the user.
    return fallback;
  }
}
