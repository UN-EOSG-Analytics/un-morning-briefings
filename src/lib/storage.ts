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
    const response = await fetch('/api/entries');
    
    if (!response.ok) {
      throw new Error('Failed to fetch entries');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
}

export async function deleteEntry(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/entries/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete entry');
    }
  } catch (error) {
    console.error('Error deleting entry:', error);
    throw error;
  }
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
