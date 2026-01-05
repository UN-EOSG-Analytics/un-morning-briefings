import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { blobStorage } from '@/lib/blob-storage';

// GET image by ID - returns the image data from blob storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('GET /api/images/[id]: Request for image ID:', id);

    if (!id) {
      return NextResponse.json({ error: 'No image ID provided' }, { status: 400 });
    }

    // Fetch image metadata from database
    const result = await query(
      `SELECT id, blob_url, mime_type, filename FROM pu_morning_briefings.images WHERE id = $1`,
      [id]
    );

    console.log('GET /api/images/[id]: Database query returned', result.rows.length, 'rows');

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = result.rows[0];
    console.log('GET /api/images/[id]: Found image:', {
      id: image.id,
      blobUrl: image.blob_url,
      mimeType: image.mime_type,
      filename: image.filename,
    });

    // Download image from blob storage
    console.log('GET /api/images/[id]: Downloading from blob storage...');
    const buffer = await blobStorage.download(image.blob_url);
    console.log('GET /api/images/[id]: Successfully downloaded, size:', buffer.length);

    // Return image with proper content type
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': image.mime_type,
        'Content-Disposition': `inline; filename="${image.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('GET /api/images/[id]: Error fetching image:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
