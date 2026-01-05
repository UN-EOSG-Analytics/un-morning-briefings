'use client';

import { MorningMeetingForm } from '@/components/MorningMeetingForm';
import { MorningMeetingEntry } from '@/types/morning-meeting';
import { saveEntry, getAllEntries, updateEntry } from '@/lib/storage';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { usePopup } from '@/lib/popup-context';

function FormContent() {
  const router = useRouter();
  const { error: showError, success: showSuccess } = usePopup();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [initialData, setInitialData] = useState<MorningMeetingEntry | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchParams(params);
    
    const editId = params.get('edit');
    if (editId) {
      // Load entry data for editing
      const loadEntry = async () => {
        try {
          const entries = await getAllEntries();
          const entryToEdit = entries.find((entry) => entry.id === editId);
          if (entryToEdit) {
            setInitialData(entryToEdit);
          }
        } catch (error) {
          console.error('Error loading entry:', error);
          showError('Failed to Load', 'Unable to load entry for editing');
        } finally {
          setIsLoading(false);
        }
      };
      loadEntry();
    } else {
      setIsLoading(false);
    }
  }, [showError]);

  const handleSubmit = async (data: MorningMeetingEntry) => {
    try {
      const editId = searchParams?.get('edit');
      if (editId) {
        // Update existing entry
        await updateEntry(editId, data);
        showSuccess('Success', 'Entry updated successfully!');
      } else {
        // Create new entry
        await saveEntry(data);
        showSuccess('Success', 'Entry submitted successfully!');
      }
      router.push('/list');
    } catch (error) {
      console.error('Error submitting form:', error);
      showError('Failed to Submit', 'Unable to submit entry. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/list');
  };

  if (isLoading) {
    return <main className="flex items-center justify-center py-12">Loading...</main>;
  }

  return (
    <main>
      <MorningMeetingForm 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
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
