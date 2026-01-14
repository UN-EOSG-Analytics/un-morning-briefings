'use client';

import { Suspense } from 'react';
import { MorningMeetingList } from '@/components/MorningMeetingList';
import { useSearchParams } from 'next/navigation';

function ListPageContent() {
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get('date') || undefined;

  return (
    <div className="bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <MorningMeetingList initialDateFilter={dateFilter} />
      </main>
    </div>
  );
}

export default function ListPage() {
  return (
    <Suspense>
      <ListPageContent />
    </Suspense>
  );
}
