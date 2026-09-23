/**
 * Helper utility for Safari/iOS compatible image handling, compression, and conversion.
 * 
 * Solves:
 * 1. Massive 15MB+ iPhone camera/screenshot photos causing Safari fetch memory exhaustion / socket drop.
 * 2. iOS HEIC/HEIF conversion into universal JPEG so all browsers and admin panel can view proofs.
 * 3. Graceful fallback on canvas failure or timeout so user flow NEVER blocks.
 */

export interface PreparedImageResult {
  fileToUpload: File | Blob;
  previewUrl: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  isCompressed: boolean;
}

/**
 * Resizes and compresses an image file to a lightweight, crystal-clear JPEG.
 * Preserves high clarity for text, amounts, UTR numbers, and bank stamps.
 */
export async function prepareProofImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<PreparedImageResult> {
  const originalSize = file.size;
  const originalName = file.name || 'proof.jpg';
  const cleanBaseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFileName = `${cleanBaseName}.jpg`;

  // If file is already a small JPEG/PNG (< 400KB), we can use it directly while providing preview
  const isHeic = (file.type && (file.type.includes('heic') || file.type.includes('heif'))) ||
                 /\.(heic|heif)$/i.test(originalName);

  return new Promise((resolve) => {
    // Safety timeout: If Safari canvas/image loading takes longer than 4.5 seconds,
    // gracefully fall back to original file to never leave user stuck!
    let isSettled = false;
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        console.warn('[ImageHelper] Compression timeout reached. Falling back to original file.');
        try {
          const previewUrl = URL.createObjectURL(file);
          resolve({
            fileToUpload: file,
            previewUrl,
            fileName: originalName,
            originalSize,
            compressedSize: originalSize,
            isCompressed: false
          });
        } catch {
          resolve({
            fileToUpload: file,
            previewUrl: '',
            fileName: originalName,
            originalSize,
            compressedSize: originalSize,
            isCompressed: false
          });
        }
      }
    }, 4500);

    const safeFallback = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutId);
      try {
        const previewUrl = URL.createObjectURL(file);
        resolve({
          fileToUpload: file,
          previewUrl,
          fileName: originalName,
          originalSize,
          compressedSize: originalSize,
          isCompressed: false
        });
      } catch {
        resolve({
          fileToUpload: file,
          previewUrl: '',
          fileName: originalName,
          originalSize,
          compressedSize: originalSize,
          isCompressed: false
        });
      }
    };

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      // Safari crossOrigin requirement for blob URLs
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const origWidth = img.naturalWidth || img.width;
          const origHeight = img.naturalHeight || img.height;

          if (!origWidth || !origHeight) {
            URL.revokeObjectURL(objectUrl);
            return safeFallback();
          }

          // Calculate scaled dimensions
          let targetWidth = origWidth;
          let targetHeight = origHeight;

          if (origWidth > maxDimension || origHeight > maxDimension) {
            if (origWidth > origHeight) {
              targetWidth = maxDimension;
              targetHeight = Math.round((origHeight * maxDimension) / origWidth);
            } else {
              targetHeight = maxDimension;
              targetWidth = Math.round((origWidth * maxDimension) / origHeight);
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            return safeFallback();
          }

          // Fill white background in case of transparent PNG/screenshot
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Clean up initial object URL
          URL.revokeObjectURL(objectUrl);

          // Convert to blob
          if (canvas.toBlob) {
            canvas.toBlob(
              (blob) => {
                if (isSettled) return;
                isSettled = true;
                clearTimeout(timeoutId);

                if (!blob) {
                  return safeFallback();
                }

                // If compressed blob is larger than original and not HEIC, prefer original
                if (!isHeic && blob.size >= originalSize && originalSize < 1.5 * 1024 * 1024) {
                  return safeFallback();
                }

                const compressedFile = new File([blob], targetFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                const previewUrl = URL.createObjectURL(compressedFile);

                resolve({
                  fileToUpload: compressedFile,
                  previewUrl,
                  fileName: targetFileName,
                  originalSize,
                  compressedSize: blob.size,
                  isCompressed: true
                });
              },
              'image/jpeg',
              quality
            );
          } else {
            // Fallback for very old canvas implementation
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timeoutId);

            resolve({
              fileToUpload: file,
              previewUrl: dataUrl,
              fileName: targetFileName,
              originalSize,
              compressedSize: originalSize,
              isCompressed: false
            });
          }
        } catch (canvasErr) {
          console.warn('[ImageHelper] Canvas conversion error:', canvasErr);
          URL.revokeObjectURL(objectUrl);
          safeFallback();
        }
      };

      img.onerror = (imgErr) => {
        console.warn('[ImageHelper] Image load error:', imgErr);
        URL.revokeObjectURL(objectUrl);
        safeFallback();
      };

      img.src = objectUrl;
    } catch (e) {
      console.warn('[ImageHelper] Setup error:', e);
      safeFallback();
    }
  });
}

/**
 * Safely releases object URLs to avoid WebKit memory leaks in iOS Safari
 */
export function revokePreviewUrl(url?: string | null) {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
}
