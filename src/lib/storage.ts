import { MorningMeetingEntry } from '@/types/morning-meeting';

/**
 * Extract images from HTML content
 */
function extractImagesFromHtml(html: string): { images: any[]; updatedHtml: string } {
  const images: any[] = [];
  let position = 0;

  if (typeof window === 'undefined') {
    return { images: [], updatedHtml: html };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = doc.querySelectorAll('img');

  imgElements.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && src.startsWith('data:')) {
      const matches = src.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const data = matches[2];
        const width = parseInt(img.getAttribute('data-width') || '400');
        const height = parseInt(img.getAttribute('data-height') || '300');
        
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

  return {
    images,
    updatedHtml: doc.body.innerHTML,
  };
}

export async function saveEntry(entry: MorningMeetingEntry): Promise<any> {
  try {
    const { images, updatedHtml } = extractImagesFromHtml(entry.entry);

    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...entry,
        entry: updatedHtml,
        images,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save entry');
    }

    return await response.json();
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
