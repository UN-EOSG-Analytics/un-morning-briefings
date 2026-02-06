/* eslint-disable @typescript-eslint/no-explicit-any */
import { MorningMeetingEntry } from "@/types/morning-meeting";
import { convertEntriesImageReferences } from "@/lib/image-conversion";

/**
 * Extract images from HTML content and prepare them for upload to blob storage
 * - Finds all data: URL images (fresh uploads)
 * - Replaces them with image-ref:// references
 * - Skips already-saved image-ref:// URLs
 * - Skips external http/https URLs (handled during export)
 *
 * @param html - HTML content containing images
 * @returns Object with extracted image data and updated HTML
 */
function extractImagesFromHtml(html: string): {
  images: any[];
  updatedHtml: string;
} {
  const images: any[] = [];
  let position = 0;

  if (typeof window === "undefined") {
    return { images: [], updatedHtml: html };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgElements = doc.querySelectorAll("img");

  imgElements.forEach((img) => {
    const src = img.getAttribute("src");

    // Only extract images with data: URLs (fresh uploads)
    // Skip image-ref:// URLs (already saved images)
    if (src && src.startsWith("data:")) {
      const matches = src.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const data = matches[2];
        const width = parseInt(img.getAttribute("data-width") || "400");
        const height = parseInt(img.getAttribute("data-height") || "300");

        const imageId = `img-${position}`;
        images.push({
          filename: `image-${position}.${mimeType.split("/")[1]}`,
          mimeType,
          data,
          width,
          height,
          position,
        });

        // Replace base64 src with reference ID
        img.setAttribute("src", `image-ref://${imageId}`);
        position++;
      }
    }
    // image-ref:// URLs (already saved) and external URLs are kept as-is
  });

  return {
    images,
    updatedHtml: doc.body.innerHTML,
  };
}

/**
 * Save a new morning meeting entry to the database
 * Extracts and uploads images to blob storage
 *
 * @param entry - The entry data to save
 * @returns Promise that resolves to the created entry with ID
 */
export async function saveEntry(entry: MorningMeetingEntry): Promise<any> {
  try {
    const { images, updatedHtml } = extractImagesFromHtml(entry.entry);

    const payload = {
      ...entry,
      entry: updatedHtml,
      images,
    };

    const response = await fetch("/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("saveEntry: API error:", response.status, errorText);
      throw new Error("Failed to save entry");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error saving entry:", error);
    throw error;
  }
}

/**
 * Fetch all entries from the API
 * Automatically converts image-ref:// references to data URLs for display
 *
 * @returns Promise that resolves to array of entries
 */
export async function getAllEntries(): Promise<any[]> {
  try {
    const response = await fetch("/api/entries");

    if (!response.ok) {
      throw new Error("Failed to fetch entries");
    }

    const entries = await response.json();

    // Client-side fallback: Convert image-ref:// to data URLs using images array
    return await convertEntriesImageReferences(entries, "getAllEntries");
  } catch (error) {
    console.error("Error fetching entries:", error);
    return [];
  }
}

/**
 * Delete an entry by ID
 *
 * @param id - Entry ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteEntry(id: string): Promise<void> {
  const response = await fetch(`/api/entries/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete entry: ${errorText}`);
  }

  await response.json();
}

export async function updateEntry(
  id: string,
  updatedEntry: Partial<MorningMeetingEntry>,
): Promise<any> {
  try {
    // Remove fields that shouldn't be sent to the API
    const {
      id: entryId,
      approved,
      images: existingImages,
      ...cleanEntry
    } = updatedEntry as any;

    const body: any = { ...cleanEntry };

    // Only process and include entry if it's being updated
    if (cleanEntry.entry !== undefined) {
      const { images, updatedHtml } = extractImagesFromHtml(cleanEntry.entry);
      body.entry = updatedHtml;
      if (images.length > 0) {
        body.images = images;
      }
    } else {
      // If entry is not being updated, remove it from the body to avoid sending undefined
      delete body.entry;
    }

    const response = await fetch(`/api/entries/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error:", response.status, errorData);
      throw new Error(`Failed to update entry: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating entry:", error);
    throw error;
  }
}

export async function getEntryById(id: string): Promise<any> {
  try {
    const response = await fetch(`/api/entries/${id}`);

    if (!response.ok) {
      /**
       * Update an existing entry
       * Extracts and uploads any new images to blob storage
       *
       * @param id - Entry ID to update
       * @param updatedEntry - Partial entry data to update
       * @returns Promise that resolves to the updated entry
       */
      throw new Error("Failed to fetch entry");
    }

    const entry = await response.json();

    // Note: The API already converts image-ref:// to data URLs
    // Note: The API already converts image-ref:// to data URLs
    // So entry.entry should already contain the proper image data

    return entry;
  } catch (error) {
    console.error("Error fetching entry:", error);
    throw error;
  }
}

/**
 * Fetch draft entries for a specific user by email
 * Converts image references for display
 *
 * @param authorEmail - Author email to filter by (looks up user via foreign key)
 * @returns Promise that resolves to array of draft entries
 */
export async function getDraftEntries(authorEmail: string): Promise<any[]> {
  try {
    // Use noConvert=true to skip expensive image conversion for list view
    // API filters by author email (foreign key lookup)
    const response = await fetch(
      `/api/entries?status=draft&author=${encodeURIComponent(authorEmail)}&noConvert=true`,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch draft entries: ${errorData.details || response.statusText}`,
      );
    }

    const entries = await response.json();

    // Client-side fallback: Convert image-ref:// to data URLs using images array
    return await convertEntriesImageReferences(entries, "getDraftEntries");
  } catch (error) {
    console.error("Error fetching draft entries:", error);
    return [];
  }
}

/**
 * Fetch submitted entries awaiting approval
 * Converts image references for display
 *
 * @returns Promise that resolves to array of submitted entries
 */
export async function getSubmittedEntries(): Promise<any[]> {
  try {
    // Use noConvert=true to skip expensive image conversion for list view
    const response = await fetch(
      "/api/entries?status=submitted&noConvert=true",
    );

    if (!response.ok) {
      let errorData: any = {};
      try {
        const text = await response.text();
        if (text) {
          errorData = JSON.parse(text);
        }
      } catch {
        // Failed to parse response
      }

      throw new Error(
        `Failed to fetch submitted entries (${response.status}): ${errorData.details || errorData.error || response.statusText}`,
      );
    }

    const entries = await response.json();

    // Client-side fallback: Convert image-ref:// to data URLs using images array
    return await convertEntriesImageReferences(entries, "getSubmittedEntries");
  } catch (error) {
    console.error("Error fetching submitted entries:", error);
    return [];
  }
}

/**
 * Toggle the approval status of an entry
 *
 * @param entryId - Entry ID to update
 * @param approvalStatus - New approval status
 * @returns Promise that resolves to the updated entry
 */
export async function toggleApproval(
  entryId: string,
  approvalStatus: "pending" | "approved" | "denied",
): Promise<any> {
  const response = await fetch(`/api/entries`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: entryId, approvalStatus }),
  });

  if (!response.ok) {
    throw new Error("Failed to update approval status");
  }

  return response.json();
}
