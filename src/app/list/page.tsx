'use client';

import { MorningMeetingList } from '@/components/MorningMeetingList';

export default function ListPage() {
  return (
    <div className="min-h-[80svh] bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <MorningMeetingList />
      </main>
    </div>
  );
}
