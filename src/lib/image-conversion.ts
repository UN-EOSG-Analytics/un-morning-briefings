/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared utilities for converting image references between storage formats
 *
 * This module provides functions for:
 * - Converting image-ref:// references to data URLs (client-side)
 * - Converting image-ref:// references to data URLs (server-side with blob storage)
 */

/**
 * Converts blob response to data URL using FileReader
 * @param blob - The blob to convert
 * @returns Promise that resolves to a data URL string
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Get the position value, falling back to array index if position is null
 * This handles legacy data where position might be null
 * @param img - Image object with optional position
 * @param images - Array of all images for the entry
 * @returns The position value to use
 */
function getImagePosition(img: any, images: any[]): number {
  return img.position !== null && img.position !== undefined
    ? img.position
    : images.indexOf(img);
}

/**
 * Convert image-ref:// references in HTML to data URLs by fetching from the API
 * This is used client-side to display images after retrieval
 *
 * @param html - HTML content with image-ref:// references
 * @param images - Array of image metadata with id, position, etc.
 * @param contextName - Name for logging context (e.g., 'getAllEntries')
 * @returns Promise that resolves to HTML with data URLs
 */
export async function convertImageReferencesToDataUrls(
  html: string,
  images: any[],
  contextName: string = "convertImageReferences",
): Promise<string> {
  if (!images || images.length === 0) {
    return html;
  }

  let updatedHtml = html;

  for (const img of images) {
    try {
      const position = getImagePosition(img, images);
      const ref = `image-ref://img-${position}`;

      if (updatedHtml.includes(ref)) {
        const imgResponse = await fetch(`/api/images/${img.id}`);
        if (imgResponse.ok) {
          const blob = await imgResponse.blob();
          const dataUrl = await blobToDataUrl(blob);
          updatedHtml = updatedHtml.replace(ref, dataUrl);
        } else {
          updatedHtml = updatedHtml.replace(ref, "");
        }
      }
    } catch (error) {
      console.error(`${contextName}: Error converting image reference:`, error);
    }
  }

  return updatedHtml;
}

/**
 * Server-side function to convert image-ref:// references to data URLs using blob storage
 * Used in API routes to convert references before sending to client
 *
 * @param html - HTML content with image-ref:// references
 * @param images - Array of image metadata with blobUrl, mimeType, position, etc.
 * @param blobStorage - Blob storage instance with download method
 * @param contextName - Name for logging context (e.g., 'GET /api/entries')
 * @returns Promise that resolves to HTML with data URLs
 */
export async function convertImageReferencesServerSide(
  html: string,
  images: any[],
  blobStorage: { download: (url: string) => Promise<Buffer> },
  contextName: string = "convertImageReferences",
): Promise<string> {
  if (!images || images.length === 0) {
    return html;
  }

  let updatedHtml = html;

  for (const img of images) {
    try {
      const position = getImagePosition(img, images);
      const ref = `image-ref://img-${position}`;

        if (updatedHtml.includes(ref)) {
        const buffer = await blobStorage.download(img.blobUrl);
        const base64Data = buffer.toString("base64");
        const dataUrl = `data:${img.mimeType};base64,${base64Data}`;
        updatedHtml = updatedHtml.replace(ref, dataUrl);
      }
    } catch (error) {
      console.error(
        `${contextName}: Error downloading image ${img.id} from blob storage:`,
        error,
      );
      // Remove the broken reference
      const position = getImagePosition(img, images);
      const ref = `image-ref://img-${position}`;
      updatedHtml = updatedHtml.replace(ref, "");
    }
  }

  return updatedHtml;
}

/**
 * Process all entries and convert their image references
 * Client-side batch processor
 *
 * @param entries - Array of entries with entry content and images
 * @param contextName - Name for logging context
 * @returns Promise that resolves to entries with converted image references
 */
export async function convertEntriesImageReferences(
  entries: any[],
  contextName: string = "convertEntries",
): Promise<any[]> {
  for (const entry of entries) {
    if (entry.images && entry.images.length > 0 && entry.entry) {
      entry.entry = await convertImageReferencesToDataUrls(
        entry.entry,
        entry.images,
        contextName,
      );
    }
  }
  return entries;
}
