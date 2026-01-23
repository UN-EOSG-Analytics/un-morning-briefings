import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { blobStorage } from "@/lib/blob-storage";
import { checkAuth } from "@/lib/auth-helper";

// GET image by ID - returns the image data from blob storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "No image ID provided" }, { status: 400 });
    }

    const result = await query(
      `SELECT id, blob_url, mime_type, filename FROM pu_morning_briefings.images WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const image = result.rows[0];
    const buffer = await blobStorage.download(image.blob_url);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": image.mime_type,
        "Content-Disposition": `inline; filename="${image.filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET /api/images/[id]: Error fetching image:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
