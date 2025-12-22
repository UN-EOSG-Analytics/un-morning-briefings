import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { blobStorage } from '@/lib/blob-storage';

// GET single entry
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

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

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching entry:', error);
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
}

// PUT update entry
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entry: entryContent, images, ...data } = body;

    // Delete existing images from blob storage and database if new ones are provided
    if (images) {
      const existingImagesResult = await query(
        `SELECT id, blob_url FROM images WHERE entry_id = $1`,
        [id]
      );

      // Delete from blob storage
      for (const img of existingImagesResult.rows) {
        try {
          await blobStorage.delete(img.blob_url);
        } catch (error) {
          console.error('Error deleting blob:', error);
        }
      }

      // Delete from database
      await query(`DELETE FROM images WHERE entry_id = $1`, [id]);
    }

    // Upload new images to blob storage
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

    // Update entry
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (data.category !== undefined) {
      updateFields.push(`category = $${paramCount++}`);
      updateValues.push(data.category);
    }
    if (data.priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      updateValues.push(data.priority);
    }
    if (data.region !== undefined) {
      updateFields.push(`region = $${paramCount++}`);
      updateValues.push(data.region);
    }
    if (data.country !== undefined) {
      updateFields.push(`country = $${paramCount++}`);
      updateValues.push(data.country);
    }
    if (data.headline !== undefined) {
      updateFields.push(`headline = $${paramCount++}`);
      updateValues.push(data.headline);
    }
    if (data.date !== undefined) {
      updateFields.push(`date = $${paramCount++}`);
      updateValues.push(new Date(data.date));
    }
    if (entryContent !== undefined) {
      updateFields.push(`entry = $${paramCount++}`);
      updateValues.push(entryContent);
    }
    if (data.sourceUrl !== undefined) {
      updateFields.push(`source_url = $${paramCount++}`);
      updateValues.push(data.sourceUrl);
    }
    if (data.puNote !== undefined) {
      updateFields.push(`pu_note = $${paramCount++}`);
      updateValues.push(data.puNote);
    }
    if (data.author !== undefined) {
      updateFields.push(`author = $${paramCount++}`);
      updateValues.push(data.author);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(data.status);
    }

    updateFields.push(`updated_at = $${paramCount++}`);
    updateValues.push(new Date());
    updateValues.push(id);

    if (updateFields.length > 1) {
      await query(
        `UPDATE entries SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        updateValues
      );
    }

    // Insert new images if any
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
            new Date(),
          ]
        );
      }
    }

    // Fetch updated entry with images
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

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

// DELETE entry
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Delete images from blob storage first
    const existingImagesResult = await query(
      `SELECT id, blob_url FROM images WHERE entry_id = $1`,
      [id]
    );

    for (const img of existingImagesResult.rows) {
      try {
        await blobStorage.delete(img.blob_url);
      } catch (error) {
        console.error('Error deleting blob:', error);
      }
    }

    // Delete entry (will cascade delete images from database)
    await query(`DELETE FROM entries WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
