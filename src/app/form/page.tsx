'use client';

import { MorningMeetingForm } from '@/components/MorningMeetingForm';
import { MorningMeetingEntry } from '@/types/morning-meeting';
import { saveEntry } from '@/lib/storage';
import { useRouter } from 'next/navigation';

export default function MorningMeetingPage() {
  const router = useRouter();

  const handleSubmit = async (data: MorningMeetingEntry) => {
    try {
      saveEntry(data);
      alert('Entry submitted successfully!');
      router.push('/list');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit entry. Please try again.');
    }
  };

  return (
    <main>
      <MorningMeetingForm onSubmit={handleSubmit} />
    </main>
  );
}
