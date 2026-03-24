import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-helper";
import { sendEmail, buildEmailHtml } from "@/lib/email-service";
import { formatDateLong } from "@/lib/format-date";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await checkAuth();
    if (!auth.authenticated || !auth.session?.user?.email) {
      return (
        auth.response ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { docxBlob, fileName, briefingDate } = await request.json();

    if (!docxBlob || !fileName) {
      return NextResponse.json(
        { error: "Missing docxBlob or fileName" },
        { status: 400 },
      );
    }

    // Convert base64 blob to Buffer
    const base64Data = docxBlob.split(",")[1] || docxBlob;
    const buffer = Buffer.from(base64Data, "base64");

    const formattedDate = formatDateLong(briefingDate);

    const contentHtml = `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        This is an automated notice that today's Morning Meeting Notes compiled by the PU Team are attached.
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        Best regards,
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        EOSG Services
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
        For technical assistance, please email SPMU-Support@un.org
      </p>`;

    const html = buildEmailHtml(contentHtml);
    const text = `United Nations | Morning Briefings\n\nThis is an automated notice that today's Morning Meeting Notes compiled by the PU Team are attached.\nBest regards,\nEOSG Services\nFor technical assistance, please email SPMU-Support@un.org`;

    const success = await sendEmail(
      auth.session.user.email,
      `Morning Briefing - ${formattedDate}`,
      html,
      text,
      {
        attachments: [
          {
            filename: fileName,
            content: buffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          },
        ],
      },
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("[SEND-BRIEFING] Error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
