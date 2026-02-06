"use client";

import { ProfileEntries } from "@/components/ProfileEntries";

export default function ProfilePage() {
  return (
    <div className="bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ProfileEntries />
      </main>
    </div>
  );
}
