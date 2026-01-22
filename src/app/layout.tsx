import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PopupProvider } from "@/lib/popup-context";
import { UnsavedChangesProvider } from "@/lib/unsaved-changes-context";
import { PopupContainer } from "@/components/Popup";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

// https://fonts.google.com/specimen/Roboto
// 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold), 900 (Black)
const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "United Nations | Morning Briefings",
  description:
    "A web application to manage Morning Briefings for the United Nations.",
  openGraph: {
    title: "United Nations Morning Briefings",
    description:
      "A web application to manage Morning Briefings for the United Nations.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#009edb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.className} antialiased`}>
      <body className="bg-white">
        <AuthProvider>
          <PopupProvider>
            <UnsavedChangesProvider>
              <Navbar />
              <div className="flex-1 pt-16">{children}</div>
              <Footer />
              <PopupContainer />
            </UnsavedChangesProvider>
          </PopupProvider>
        </AuthProvider>
        <GoogleAnalytics gaId="G-XYZ" />
      </body>
    </html>
  );
}
