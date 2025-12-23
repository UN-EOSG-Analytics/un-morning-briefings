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

    if (!id) {
      return NextResponse.json({ error: 'No image ID provided' }, { status: 400 });
    }

    // Fetch image metadata from database
    const result = await query(
      `SELECT id, blob_url, mime_type, filename FROM images WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = result.rows[0];

    // Download image from blob storage
    const buffer = await blobStorage.download(image.blob_url);

    // Return image with proper content type
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': image.mime_type,
        'Content-Disposition': `inline; filename="${image.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
