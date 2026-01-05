import { MorningMeetingEntry } from '@/types/morning-meeting';

/**
 * Extract images from HTML content
 */
function extractImagesFromHtml(html: string): { images: any[]; updatedHtml: string } {
  const images: any[] = [];
  let position = 0;

  if (typeof window === 'undefined') {
    console.log('extractImagesFromHtml: Running on server side, returning unchanged HTML');
    return { images: [], updatedHtml: html };
  }

  console.log('extractImagesFromHtml: Starting extraction from HTML:', html.substring(0, 200));

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = doc.querySelectorAll('img');

  console.log('extractImagesFromHtml: Found', imgElements.length, 'image elements');

  imgElements.forEach((img) => {
    const src = img.getAttribute('src');
    console.log('extractImagesFromHtml: Processing image with src:', src?.substring(0, 50));
    
    // Only extract images with data: URLs (fresh uploads)
    // Skip image-ref:// URLs (already saved images)
    if (src && src.startsWith('data:')) {
      const matches = src.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const data = matches[2];
        const width = parseInt(img.getAttribute('data-width') || '400');
        const height = parseInt(img.getAttribute('data-height') || '300');
        
        console.log('extractImagesFromHtml: Extracted image with dimensions:', width, 'x', height);
        
        const imageId = `img-${position}`;
        images.push({
          filename: `image-${position}.${mimeType.split('/')[1]}`,
          mimeType,
          data,
          width,
          height,
          position,
        });

        // Replace base64 src with reference ID
        img.setAttribute('src', `image-ref://${imageId}`);
        position++;
      }
    } else if (src && src.startsWith('image-ref://')) {
      console.log('extractImagesFromHtml: Skipping already-saved image reference:', src);
      // Keep the reference as-is, don't try to extract it
    } else if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      console.log('extractImagesFromHtml: Found external URL image:', src.substring(0, 50));
      console.log('extractImagesFromHtml: External URLs are not downloaded - they will be embedded as-is in exports');
      // External URLs are left as-is in the HTML
      // They won't be uploaded to blob storage
      // During export, they'll be handled by the export logic
    }
  });

  console.log('extractImagesFromHtml: Total images extracted:', images.length);

  return {
    images,
    updatedHtml: doc.body.innerHTML,
  };
}

export async function saveEntry(entry: MorningMeetingEntry): Promise<any> {
  try {
    console.log('saveEntry: Starting with entry.entry length:', entry.entry.length);
    const { images, updatedHtml } = extractImagesFromHtml(entry.entry);
    
    console.log('saveEntry: Extracted', images.length, 'images');
    console.log('saveEntry: Updated HTML length:', updatedHtml.length);

    const payload = {
      ...entry,
      entry: updatedHtml,
      images,
    };
    
    console.log('saveEntry: Sending payload with', images.length, 'images to API');

    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('saveEntry: API error:', response.status, errorText);
      throw new Error('Failed to save entry');
    }

    const result = await response.json();
    console.log('saveEntry: Success, received entry ID:', result.id);
    return result;
  } catch (error) {
    console.error('Error saving entry:', error);
    throw error;
  }
}

export async function getAllEntries(): Promise<any[]> {
  try {
    console.log('getAllEntries: Fetching from API');
    const response = await fetch('/api/entries');
    
    if (!response.ok) {
      throw new Error('Failed to fetch entries');
    }

    const entries = await response.json();
    console.log('getAllEntries: Received', entries.length, 'entries');
    
    // Client-side fallback: Convert image-ref:// to data URLs using images array
    for (const entry of entries) {
      if (entry.images && entry.images.length > 0 && entry.entry) {
        let html = entry.entry;
        console.log('getAllEntries: Converting', entry.images.length, 'image references for entry', entry.id);
        
        for (const img of entry.images) {
          try {
            const ref = `image-ref://img-${img.position}`;
            if (html.includes(ref)) {
              console.log('getAllEntries: Found reference', ref, 'fetching from /api/images/' + img.id);
              // Fetch image from API
              const imgResponse = await fetch(`/api/images/${img.id}`);
              if (imgResponse.ok) {
                const blob = await imgResponse.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    html = html.replace(ref, dataUrl);
                    console.log('getAllEntries: Successfully replaced reference with data URL');
                    resolve(null);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              } else {
                console.error('getAllEntries: Failed to fetch image', img.id);
                html = html.replace(ref, '');
              }
            }
          } catch (error) {
            console.error('getAllEntries: Error converting image reference:', error);
          }
        }
        entry.entry = html;
      }
    }
    
    if (entries.length > 0) {
      console.log('getAllEntries: After conversion, first entry HTML preview:', entries[0].entry?.substring(0, 200));
    }
    return entries;
  } catch (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const response = await fetch(`/api/entries/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete entry: ${errorText}`);
  }

  await response.json();
}

export async function updateEntry(id: string, updatedEntry: Partial<MorningMeetingEntry>): Promise<any> {
  try {
    const { images, updatedHtml } = updatedEntry.entry 
      ? extractImagesFromHtml(updatedEntry.entry)
      : { images: [], updatedHtml: '' };

    const response = await fetch(`/api/entries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...updatedEntry,
        entry: updatedHtml || updatedEntry.entry,
        images: images.length > 0 ? images : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update entry');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating entry:', error);
    throw error;
  }
}

export async function getEntryById(id: string): Promise<any> {
  try {
    const response = await fetch(`/api/entries/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch entry');
    }

    const entry = await response.json();
    
    // Note: The API already converts image-ref:// to data URLs
    // So entry.entry should already contain the proper image data
    
    return entry;
  } catch (error) {
    console.error('Error fetching entry:', error);
    throw error;
  }
}

export async function getDraftEntries(author: string): Promise<any[]> {
  try {
    console.log('getDraftEntries: Fetching drafts for author:', author);
    const response = await fetch(`/api/entries?status=draft&author=${encodeURIComponent(author)}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('getDraftEntries: API error response:', errorData);
      throw new Error(`Failed to fetch draft entries: ${errorData.details || response.statusText}`);
    }

    const entries = await response.json();
    console.log('getDraftEntries: Received', entries.length, 'draft entries');
    
    // Client-side fallback: Convert image-ref:// to data URLs using images array
    for (const entry of entries) {
      if (entry.images && entry.images.length > 0 && entry.entry) {
        let html = entry.entry;
        console.log('getDraftEntries: Converting', entry.images.length, 'image references for entry', entry.id);
        
        for (const img of entry.images) {
          try {
            const ref = `image-ref://img-${img.position}`;
            if (html.includes(ref)) {
              console.log('getDraftEntries: Found reference', ref, 'fetching from /api/images/' + img.id);
              const imgResponse = await fetch(`/api/images/${img.id}`);
              if (imgResponse.ok) {
                const blob = await imgResponse.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    html = html.replace(ref, dataUrl);
                    console.log('getDraftEntries: Successfully replaced reference with data URL');
                    resolve(null);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              } else {
                console.error('getDraftEntries: Failed to fetch image', img.id);
                html = html.replace(ref, '');
              }
            }
          } catch (error) {
            console.error('getDraftEntries: Error converting image reference:', error);
          }
        }
        entry.entry = html;
      }
    }
    
    return entries;
  } catch (error) {
    console.error('Error fetching draft entries:', error);
    return [];
  }
}

export async function getSubmittedEntries(): Promise<any[]> {
  try {
    console.log('getSubmittedEntries: Fetching submitted entries');
    const response = await fetch('/api/entries?status=submitted');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('getSubmittedEntries: API error response:', errorData);
      throw new Error(`Failed to fetch submitted entries: ${errorData.details || response.statusText}`);
    }

    const entries = await response.json();
    console.log('getSubmittedEntries: Received', entries.length, 'submitted entries');
    
    // Client-side fallback: Convert image-ref:// to data URLs using images array
    for (const entry of entries) {
      if (entry.images && entry.images.length > 0 && entry.entry) {
        let html = entry.entry;
        console.log('getSubmittedEntries: Converting', entry.images.length, 'image references for entry', entry.id);
        
        for (const img of entry.images) {
          try {
            const ref = `image-ref://img-${img.position}`;
            if (html.includes(ref)) {
              const imgResponse = await fetch(`/api/images/${img.id}`);
              if (imgResponse.ok) {
                const blob = await imgResponse.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    html = html.replace(ref, dataUrl);
                    resolve(null);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              } else {
                html = html.replace(ref, '');
              }
            }
          } catch (error) {
            console.error('getSubmittedEntries: Error converting image reference:', error);
          }
        }
        entry.entry = html;
      }
    }
    
    return entries;
  } catch (error) {
    console.error('Error fetching submitted entries:', error);
    return [];
  }
}
export async function toggleApproval(entryId: string, approved: boolean): Promise<any> {
  try {
    const response = await fetch('/api/entries', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: entryId, approved }),
    });

    if (!response.ok) {
      throw new Error('Failed to update approval status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling approval:', error);
    throw error;
  }
}