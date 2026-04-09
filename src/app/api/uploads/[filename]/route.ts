import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { checkAuth } from "@/lib/auth-helper";

// GET uploaded file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { filename } = await params;

    if (!filename) {
      return NextResponse.json(
        { error: "No filename provided" },
        { status: 400 },
      );
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uploadsPath =
      process.env.BLOB_STORAGE_PATH ||
      path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
    const filePath = path.resolve(uploadsPath, sanitizedFilename);
    const resolvedBase = path.resolve(uploadsPath);

    // Verify resolved path is within the uploads directory
    if (!filePath.startsWith(resolvedBase + path.sep) && filePath !== resolvedBase) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type from extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    // Return file with proper content type
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving uploaded file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 },
    );
  }
}
