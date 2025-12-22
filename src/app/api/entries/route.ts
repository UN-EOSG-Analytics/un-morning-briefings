import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { blobStorage } from '@/lib/blob-storage';

// GET all entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    let sql = `
      SELECT 
        e.id,
        e.category,
        e.priority,
        e.region,
        e.country,
        e.headline,
        e.date,
        e.entry,
        e.source_url as "sourceUrl",
        e.pu_note as "puNote",
        e.author,
        e.status,
        e.created_at as "createdAt",
        e.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'entryId', i.entry_id,
              'filename', i.filename,
              'mimeType', i.mime_type,
              'blobUrl', i.blob_url,
              'width', i.width,
              'height', i.height,
              'position', i.position,
              'createdAt', i.created_at
            ) ORDER BY i.position NULLS LAST, i.created_at
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) as images
      FROM entries e
      LEFT JOIN images i ON e.id = i.entry_id
    `;

    const params: any[] = [];
    if (date) {
      sql += ` WHERE DATE(e.date) = $1`;
      params.push(date);
    }

    sql += ` GROUP BY e.id ORDER BY e.created_at DESC`;

    const result = await query(sql, params);
    
    // Convert blob URLs to data URLs for private blob storage
    for (const entry of result.rows) {
      if (entry.images && entry.images.length > 0) {
        let html = entry.entry;
        for (const img of entry.images) {
          try {
            const ref = `image-ref://img-${img.position}`;
            if (html.includes(ref)) {
              // Download image from blob storage
              const buffer = await blobStorage.download(img.blobUrl);
              const base64Data = buffer.toString('base64');
              const dataUrl = `data:${img.mimeType};base64,${base64Data}`;
              html = html.replace(ref, dataUrl);
            }
          } catch (error) {
            console.error(`Error downloading image from blob storage:`, error);
          }
        }
        entry.entry = html;
      }
    }
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

// POST create new entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entry, images, ...data } = body;

    // Upload images to blob storage
    const uploadedImages = [];
    if (images && images.length > 0) {
      for (const img of images) {
        const buffer = Buffer.from(img.data, 'base64');
        const result = await blobStorage.upload(buffer, img.filename, img.mimeType);
        uploadedImages.push({
          filename: result.filename,
          mimeType: result.mimeType,
          blobUrl: result.url,
          width: img.width,
          height: img.height,
          position: img.position,
        });
      }
    }

    // Generate ID
    const id = crypto.randomUUID();
    const now = new Date();

    // Insert entry
    await query(
      `INSERT INTO entries (
        id, category, priority, region, country, headline, date, entry,
        source_url, pu_note, author, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        data.category,
        data.priority,
        data.region,
        data.country,
        data.headline,
        new Date(data.date),
        entry,
        data.sourceUrl || null,
        data.puNote || null,
        data.author || null,
        data.status || null,
        now,
        now,
      ]
    );

    // Insert images if any
    if (uploadedImages.length > 0) {
      for (const img of uploadedImages) {
        await query(
          `INSERT INTO images (
            id, entry_id, filename, mime_type, blob_url, width, height, position, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            crypto.randomUUID(),
            id,
            img.filename,
            img.mimeType,
            img.blobUrl,
            img.width || null,
            img.height || null,
            img.position || null,
            now,
          ]
        );
      }
    }

    // Fetch created entry with images
    const result = await query(
      `SELECT 
        e.id,
        e.category,
        e.priority,
        e.region,
        e.country,
        e.headline,
        e.date,
        e.entry,
        e.source_url as "sourceUrl",
        e.pu_note as "puNote",
        e.author,
        e.status,
        e.created_at as "createdAt",
        e.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'entryId', i.entry_id,
              'filename', i.filename,
              'mimeType', i.mime_type,
              'blobUrl', i.blob_url,
              'width', i.width,
              'height', i.height,
              'position', i.position,
              'createdAt', i.created_at
            ) ORDER BY i.position NULLS LAST, i.created_at
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) as images
      FROM entries e
      LEFT JOIN images i ON e.id = i.entry_id
      WHERE e.id = $1
      GROUP BY e.id`,
      [id]
    );

    const entry = result.rows[0];
    
    // Convert blob URLs to data URLs for private blob storage
    if (entry.images && entry.images.length > 0) {
      let html = entry.entry;
      for (const img of entry.images) {
        try {
          const ref = `image-ref://img-${img.position}`;
          if (html.includes(ref)) {
            // Download image from blob storage
            const buffer = await blobStorage.download(img.blobUrl);
            const base64Data = buffer.toString('base64');
            const dataUrl = `data:${img.mimeType};base64,${base64Data}`;
            html = html.replace(ref, dataUrl);
          }
        } catch (error) {
          console.error(`Error downloading image from blob storage:`, error);
        }
      }
      entry.entry = html;
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json({ 
      error: 'Failed to create entry',
      details: errorMessage 
    }, { status: 500 });
  }
}
