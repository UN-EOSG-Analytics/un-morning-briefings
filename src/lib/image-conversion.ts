/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared utilities for converting image references between storage formats
 *
 * This module provides functions for:
 * - Converting image-ref:// references to data URLs (client-side)
 * - Converting image-ref:// references to data URLs (server-side with blob storage)
 * - Internalizing external HTTP(S) images into blob storage at save time
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
          updatedHtml = updatedHtml.replaceAll(ref, dataUrl);
        } else {
          updatedHtml = updatedHtml.replaceAll(ref, "");
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
        updatedHtml = updatedHtml.replaceAll(ref, dataUrl);
      }
    } catch (error) {
      console.error(
        `${contextName}: Error downloading image ${img.id} from blob storage:`,
        error,
      );
      // Remove the broken reference
      const position = getImagePosition(img, images);
      const ref = `image-ref://img-${position}`;
      updatedHtml = updatedHtml.replaceAll(ref, "");
    }
  }

  return updatedHtml;
}

interface BlobUploadResult {
  url: string;
  filename: string;
  mimeType: string;
}

interface InternalizedImage {
  filename: string;
  mimeType: string;
  blobUrl: string;
  width: null;
  height: null;
  position: number;
}

export function isPrivateHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

async function fetchImageBuffer(
  imageUrl: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { hostname } = new URL(imageUrl);
  if (isPrivateHostname(hostname)) return null;

  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; UN-Briefings/1.0)" },
  });
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return null;

  return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
}

/**
 * Server-side: download external HTTP(S) image URLs in HTML, upload them to blob storage,
 * and replace with image-ref:// references so they are stored like user-uploaded images.
 * Downloads are parallelized across unique URLs.
 */
export async function internalizeExternalImages(
  html: string,
  startPosition: number,
  blobStorage: { upload: (buf: Buffer, name: string, mime: string) => Promise<BlobUploadResult> },
  contextName: string = "internalizeExternalImages",
): Promise<{ html: string; images: InternalizedImage[] }> {
  const externalImgRegex =
    /<img[^>]*src=["']?(https?:\/\/[^"'\s>]+)["']?([^>]*)>/gi;

  // Collect all matches without awaiting
  const matches: Array<{ fullTag: string; imageUrl: string; restOfTag: string }> = [];
  let match;
  while ((match = externalImgRegex.exec(html)) !== null) {
    matches.push({ fullTag: match[0], imageUrl: match[1], restOfTag: match[2] });
  }
  if (matches.length === 0) return { html, images: [] };

  // Deduplicate URLs, preserving first-occurrence order
  const uniqueUrls = [...new Set(matches.map((m) => m.imageUrl))];

  // Fetch and upload all unique URLs in parallel
  const fetchResults = await Promise.all(
    uniqueUrls.map(async (imageUrl) => {
      try {
        const fetched = await fetchImageBuffer(imageUrl);
        if (!fetched) return null;

        const urlPath = new URL(imageUrl).pathname;
        const filename = decodeURIComponent(
          urlPath.split("/").pop() || "external-image.jpg",
        );
        const uploadResult = await blobStorage.upload(
          fetched.buffer,
          filename,
          fetched.contentType,
        );
        return { imageUrl, uploadResult, contentType: fetched.contentType };
      } catch (error) {
        console.error(
          `${contextName}: Error internalizing external image:`,
          imageUrl,
          error,
        );
        return null;
      }
    }),
  );

  // Assign positions to successful results in original URL order
  const urlToRef = new Map<string, string>();
  const images: InternalizedImage[] = [];
  let position = startPosition;

  for (const result of fetchResults) {
    if (!result) continue;
    const ref = `image-ref://img-${position}`;
    urlToRef.set(result.imageUrl, ref);
    images.push({
      filename: result.uploadResult.filename,
      mimeType: result.uploadResult.mimeType,
      blobUrl: result.uploadResult.url,
      width: null,
      height: null,
      position,
    });
    position++;
  }

  // Apply replacements
  for (const { fullTag, imageUrl, restOfTag } of matches) {
    const ref = urlToRef.get(imageUrl);
    if (ref) {
      html = html.replaceAll(fullTag, `<img src="${ref}"${restOfTag}>`);
    }
  }

  return { html, images };
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
