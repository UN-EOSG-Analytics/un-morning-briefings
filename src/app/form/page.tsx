'use client';

import { MorningMeetingForm } from '@/components/MorningMeetingForm';
import { MorningMeetingEntry } from '@/types/morning-meeting';
import { saveEntry, getAllEntries, updateEntry } from '@/lib/storage';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

function FormContent() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [initialData, setInitialData] = useState<MorningMeetingEntry | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchParams(params);
    
    const editId = params.get('edit');
    if (editId) {
      const entries = getAllEntries();
      const entryToEdit = entries.find((entry) => entry.id === editId);
      if (entryToEdit) {
        setInitialData(entryToEdit);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = async (data: MorningMeetingEntry) => {
    try {
      const editId = searchParams?.get('edit');
      if (editId) {
        // Update existing entry
        updateEntry(editId, data);
        alert('Entry updated successfully!');
      } else {
        // Create new entry
        saveEntry(data);
        alert('Entry submitted successfully!');
      }
      router.push('/list');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit entry. Please try again.');
    }
  };

  if (isLoading) {
    return <main className="flex items-center justify-center py-12">Loading...</main>;
  }

  return (
    <main>
      <MorningMeetingForm 
        onSubmit={handleSubmit} 
        initialData={initialData} 
        isEditing={!!searchParams?.get('edit')} 
      />
    </main>
  );
}

export default function MorningMeetingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12">Loading...</div>}>
      <FormContent />
    </Suspense>
  );
}
