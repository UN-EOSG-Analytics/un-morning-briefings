'use client';

import { MorningMeetingList } from '@/components/MorningMeetingList';
import { useSearchParams } from 'next/navigation';

export default function ListPage() {
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get('date') || undefined;

  return (
    <div className="min-h-[80svh] bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <MorningMeetingList initialDateFilter={dateFilter} />
      </main>
    </div>
  );
}
