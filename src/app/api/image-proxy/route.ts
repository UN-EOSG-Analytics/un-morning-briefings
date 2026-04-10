import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-helper";
import { isPrivateHostname } from "@/lib/image-conversion";

/**
 * Proxy external image URLs to avoid CORS/hotlinking issues during paste in the editor.
 * Accepts a `url` query parameter, fetches the image server-side, returns a base64 data URL.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAuth();
  if (!auth.authenticated) return auth.response;

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only HTTP(S) URLs are allowed" }, { status: 400 });
  }

  if (isPrivateHostname(parsed.hostname)) {
    return NextResponse.json({ error: "Internal URLs are not allowed" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UN-Briefings/1.0)" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "URL did not return an image" }, { status: 400 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
