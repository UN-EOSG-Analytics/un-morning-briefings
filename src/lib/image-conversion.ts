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
  return img.position !== null && img.position !== undefined ? img.position : images.indexOf(img);
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
  contextName: string = 'convertImageReferences'
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
        console.log(`${contextName}: Found reference ${ref}, fetching image ID ${img.id}`);
        
        const imgResponse = await fetch(`/api/images/${img.id}`);
        console.log(`${contextName}: Image API response status:`, imgResponse.status);
        
        if (imgResponse.ok) {
          const blob = await imgResponse.blob();
          console.log(`${contextName}: Received blob with size: ${blob.size}, type: ${blob.type}`);
          
          const dataUrl = await blobToDataUrl(blob);
          console.log(`${contextName}: Converted to data URL, length: ${dataUrl.length}`);
          
          updatedHtml = updatedHtml.replace(ref, dataUrl);
        } else {
          console.error(`${contextName}: Failed to fetch image ${img.id}, status: ${imgResponse.status}`);
          updatedHtml = updatedHtml.replace(ref, '');
        }
      } else {
        console.log(`${contextName}: Reference ${ref} not found in HTML`);
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
  contextName: string = 'convertImageReferences'
): Promise<string> {
  if (!images || images.length === 0) {
    return html;
  }

  let updatedHtml = html;

  for (const img of images) {
    try {
      const position = getImagePosition(img, images);
      const ref = `image-ref://img-${position}`;
      
      console.log(`${contextName}: Looking for reference ${ref} in HTML`);
      
      if (updatedHtml.includes(ref)) {
        console.log(`${contextName}: Found reference, downloading from ${img.blobUrl}`);
        
        // Download image from blob storage
        const buffer = await blobStorage.download(img.blobUrl);
        const base64Data = buffer.toString('base64');
        const dataUrl = `data:${img.mimeType};base64,${base64Data}`;
        
        updatedHtml = updatedHtml.replace(ref, dataUrl);
        console.log(`${contextName}: Replaced reference with data URL`);
      } else {
        console.log(`${contextName}: Reference ${ref} not found in HTML`);
      }
    } catch (error) {
      console.error(`${contextName}: Error downloading image ${img.id} from blob storage:`, error);
      // Remove the broken reference
      const position = getImagePosition(img, images);
      const ref = `image-ref://img-${position}`;
      updatedHtml = updatedHtml.replace(ref, '');
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
  contextName: string = 'convertEntries'
): Promise<any[]> {
  console.log(`${contextName}: Processing ${entries.length} entries`);
  
  for (const entry of entries) {
    if (entry.images && entry.images.length > 0 && entry.entry) {
      console.log(`${contextName}: Converting ${entry.images.length} image references for entry ${entry.id}`);
      entry.entry = await convertImageReferencesToDataUrls(entry.entry, entry.images, contextName);
    }
  }
  
  if (entries.length > 0 && entries[0].entry) {
    console.log(`${contextName}: After conversion, first entry HTML preview:`, entries[0].entry.substring(0, 200));
  }
  
  return entries;
}
