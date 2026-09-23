import { ChatAttachment } from '../types';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif',
  'pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx'
];

export function validateFileForUpload(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes). Please select a valid file.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" is too large (${formatFileSize(file.size)}). Maximum allowed size is 15 MB.`
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  const isImageMime = file.type.startsWith('image/');
  const isPdfOrDocMime = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ].includes(file.type);

  if (!isAllowedExt && !isImageMime && !isPdfOrDocMime && file.type) {
    return {
      valid: false,
      error: `File type ".${ext}" is not supported. Please upload images (JPG, PNG, WebP) or documents (PDF, DOC).`
    };
  }

  return { valid: true };
}

export async function processFileForUpload(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ChatAttachment> {
  const validation = validateFileForUpload(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  return new Promise((resolve, reject) => {
    if (onProgress) onProgress(15);

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 50) + 15;
        onProgress(percent);
      }
    };

    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}". Please try again.`));

    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl || dataUrl.length === 0) {
        return reject(new Error(`File "${file.name}" resulted in empty data.`));
      }

      if (isImage) {
        // Compress image using HTML Canvas for faster network transmission and Safari memory efficiency
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          if (onProgress) onProgress(75);
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 1600; // Optimal for sharp text in receipts/documents while keeping payload < 600KB
            let width = img.width || 800;
            let height = img.height || 600;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Export as JPEG with 0.85 quality
              const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
              if (compressedUrl && compressedUrl.length > 100) {
                if (onProgress) onProgress(100);
                return resolve({
                  name: file.name,
                  type: 'image/jpeg',
                  url: compressedUrl,
                  rawBase64: compressedUrl,
                  size: Math.round((compressedUrl.length * 3) / 4),
                  status: 'pending',
                  localFile: file
                });
              }
            }
          } catch (canvasErr) {
            // Safari canvas exception fallback (e.g. security origin or memory limit)
          }

          if (onProgress) onProgress(100);
          resolve({
            name: file.name,
            type: file.type || 'image/jpeg',
            url: dataUrl,
            rawBase64: dataUrl,
            size: file.size,
            status: 'pending',
            localFile: file
          });
        };

        img.onerror = () => {
          // If image decoding in browser fails (e.g. raw HEIC on older Safari), preserve raw dataUrl
          if (onProgress) onProgress(100);
          resolve({
            name: file.name,
            type: file.type || 'application/octet-stream',
            url: dataUrl,
            rawBase64: dataUrl,
            size: file.size,
            status: 'pending',
            localFile: file
          });
        };

        img.src = dataUrl;
      } else {
        if (onProgress) onProgress(100);
        resolve({
          name: file.name,
          type: file.type || 'application/pdf',
          url: dataUrl,
          rawBase64: dataUrl,
          size: file.size,
          status: 'pending',
          localFile: file
        });
      }
    };

    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
