import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { blobStorage } from '@/lib/blob-storage';

// GET single entry
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const entry = await prisma.entry.findUnique({
      where: { id: params.id },
      include: {
        images: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching entry:', error);
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
}

// PUT update entry
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { entry, images, ...data } = body;

    // Delete existing images from blob storage and database if new ones are provided
    if (images) {
      const existingImages = await prisma.image.findMany({
        where: { entryId: params.id },
      });

      // Delete from blob storage
      for (const img of existingImages) {
        try {
          await blobStorage.delete(img.blobUrl);
        } catch (error) {
          console.error('Error deleting blob:', error);
        }
      }

      // Delete from database
      await prisma.image.deleteMany({
        where: { entryId: params.id },
      });
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

    const updatedEntry = await prisma.entry.update({
      where: { id: params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        entry,
        images: uploadedImages.length > 0
          ? {
              create: uploadedImages,
            }
          : undefined,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

// DELETE entry
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Delete images from blob storage first
    const existingImages = await prisma.image.findMany({
      where: { entryId: params.id },
    });

    for (const img of existingImages) {
      try {
        await blobStorage.delete(img.blobUrl);
      } catch (error) {
        console.error('Error deleting blob:', error);
      }
    }

    // Delete entry (will cascade delete images from database)
    await prisma.entry.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
