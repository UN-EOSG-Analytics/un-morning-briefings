import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    // Delete existing images if new ones are provided
    if (images) {
      await prisma.image.deleteMany({
        where: { entryId: params.id },
      });
    }

    const updatedEntry = await prisma.entry.update({
      where: { id: params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        entry,
        images: images
          ? {
              create: images.map((img: any) => ({
                filename: img.filename,
                mimeType: img.mimeType,
                data: Buffer.from(img.data, 'base64'),
                width: img.width,
                height: img.height,
                position: img.position,
              })),
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
    await prisma.entry.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
