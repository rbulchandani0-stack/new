import { DocumentUploadState, UploadedDocumentRecord } from '../types';
import { apiService } from '../services/api';

export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const UPLOAD_TIMEOUT_MS = 30000; // 30 seconds

export const SUPPORTED_DOC_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf', 'gif', 'bmp'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isImage?: boolean;
  isPdf?: boolean;
}

/**
 * Validates a document file against security and formatting constraints
 */
export function validateDocumentFile(file?: File | null): ValidationResult {
  if (!file) {
    return { valid: false, error: 'Please select a document file or snap a photo.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty. Please select a valid document photo.' };
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `The document is too large (${sizeMb} MB). Please select an image under 15 MB.`
    };
  }

  const name = file.name || 'document';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const isPdf = file.type === 'application/pdf' || ext === 'pdf';
  const isImage = file.type.startsWith('image/') || SUPPORTED_DOC_EXTENSIONS.includes(ext);

  if (!isImage && !isPdf && file.type) {
    return {
      valid: false,
      error: 'This image format is not supported. Please upload a JPG, PNG, WebP, HEIC photo, or PDF.'
    };
  }

  return { valid: true, isImage, isPdf };
}

/**
 * Reads and optionally compresses an image file on the client using HTML5 Canvas.
 * Ensures fast network transfer, low mobile memory footprint, and crystal-clear text readability.
 */
export async function processDocumentFile(
  file: File,
  onProgress?: (step: 'reading' | 'compressing' | 'ready', percent: number) => void
): Promise<{ dataUrl: string; previewUrl: string; size: number; mimeType: string }> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  onProgress?.('reading', 20);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read the document file. Please select another photo.'));
    };

    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        return reject(new Error('Failed to load document content.'));
      }

      onProgress?.('reading', 50);

      // PDFs are returned directly without canvas compression
      if (validation.isPdf || rawDataUrl.startsWith('data:application/pdf')) {
        onProgress?.('ready', 100);
        return resolve({
          dataUrl: rawDataUrl,
          previewUrl: rawDataUrl,
          size: file.size,
          mimeType: 'application/pdf'
        });
      }

      // Images: compress to optimal dimension & 85% JPEG quality
      onProgress?.('compressing', 65);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDimension = 1920; // 1080p-1440p crisp resolution for IDs
          let width = img.naturalWidth || img.width || 1280;
          let height = img.naturalHeight || img.height || 720;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
            onProgress?.('ready', 100);
            return resolve({
              dataUrl: compressedUrl,
              previewUrl: compressedUrl,
              size: Math.round((compressedUrl.length * 3) / 4),
              mimeType: 'image/jpeg'
            });
          }
        } catch {
          // Fallback if canvas has memory limits or security context issues on older mobile Safari
        }

        onProgress?.('ready', 100);
        resolve({
          dataUrl: rawDataUrl,
          previewUrl: rawDataUrl,
          size: file.size,
          mimeType: file.type || 'image/jpeg'
        });
      };

      img.onerror = () => {
        // In case of native decoding failure (e.g., non-standard camera format), fallback to raw dataUrl
        onProgress?.('ready', 100);
        resolve({
          dataUrl: rawDataUrl,
          previewUrl: rawDataUrl,
          size: file.size,
          mimeType: file.type || 'image/jpeg'
        });
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Direct document upload request to the backend with timeout, progress tracking, and validation
 */
export async function uploadDocumentToServer(params: {
  target: 'id_front' | 'id_back' | 'selfie' | 'address_proof';
  fileDataUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  sessionOrUserId?: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadedDocumentRecord> {
  const { target, fileDataUrl, fileName, fileType, fileSize, sessionOrUserId, onProgress } = params;

  onProgress?.(15);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, UPLOAD_TIMEOUT_MS);

  try {
    const token = apiService.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    onProgress?.(40);

    const response = await fetch('/api/kyc/upload-document', {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        target,
        dataUrl: fileDataUrl,
        fileName,
        fileType,
        fileSize,
        sessionOrUserId
      })
    });

    clearTimeout(timeoutId);
    onProgress?.(85);

    if (!response.ok) {
      let errorMsg = 'Failed to upload document to server.';
      try {
        const errorData = await response.json();
        if (errorData?.error) errorMsg = errorData.error;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (!data || !data.success || !data.storageReference) {
      throw new Error('Server did not confirm document storage. Please retry.');
    }

    onProgress?.(100);

    const docRecord: UploadedDocumentRecord = {
      documentId: data.documentId || ('doc_' + Date.now()),
      target,
      fileName: data.fileName || fileName,
      fileSize: data.fileSize || fileSize || 0,
      mimeType: data.mimeType || fileType,
      storageReference: data.storageReference,
      url: data.url || data.storageReference,
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString(),
      previewUrl: fileDataUrl
    };

    return docRecord;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Upload is taking longer than expected. Please check your internet connection and try again.');
    }
    if (err.message && err.message.includes('Failed to fetch')) {
      throw new Error('Your connection appears unstable. Please check your internet connection and retry.');
    }
    throw new Error(err.message || 'Your document could not be uploaded. Please try again.');
  }
}
