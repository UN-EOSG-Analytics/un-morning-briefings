import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    const newEntry = await prisma.entry.create({
      data: {
        ...data,
        date: new Date(data.date),
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

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
