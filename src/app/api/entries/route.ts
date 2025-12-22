import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { blobStorage } from '@/lib/blob-storage';

// GET all entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const where = date ? { date: new Date(date) } : {};

    const entries = await prisma.entry.findMany({
      where,
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(entries);
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

    const newEntry = await prisma.entry.create({
      data: {
        ...data,
        date: new Date(data.date),
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

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
