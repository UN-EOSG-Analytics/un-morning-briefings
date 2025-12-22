'use client';

import { MorningMeetingForm } from '@/components/MorningMeetingForm';
import { MorningMeetingEntry } from '@/types/morning-meeting';

export default function MorningMeetingPage() {
  const handleSubmit = async (data: MorningMeetingEntry) => {
    try {
      const response = await fetch('/api/morning-meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert('Entry submitted successfully!');
        // Optionally redirect or reset form
        // window.location.href = '/morning-meeting/success';
      } else {
        alert(`Failed to submit entry: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit entry. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <MorningMeetingForm onSubmit={handleSubmit} />
    </main>
  );
}
