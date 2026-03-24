"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const NO_SHELL_PREFIXES = ["/login"];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = !NO_SHELL_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
