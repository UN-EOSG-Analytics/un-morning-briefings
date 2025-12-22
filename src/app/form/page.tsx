'use client';

import { MorningMeetingForm } from '@/components/MorningMeetingForm';
import { MorningMeetingEntry } from '@/types/morning-meeting';

export default function MorningMeetingPage() {
  const handleSubmit = async (data: MorningMeetingEntry) => {
    try {
      // TODO: Implement API call to submit the form
      console.log('Form submitted:', data);
      alert('Entry submitted successfully!');
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
