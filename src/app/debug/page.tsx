'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testError, setTestError] = useState<string>('');

  useEffect(() => {
    const testAuth = async () => {
      try {
        const res = await fetch('/api/test-session');
        const data = await res.json();
        setTestResponse(data);
      } catch (error) {
        setTestError(error instanceof Error ? error.message : 'Unknown error');
      }
    };
    testAuth();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug: Session Information</h1>
      
      <div className="bg-slate-100 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-3">NextAuth Session Status</h2>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Has Session:</strong> {session ? 'Yes' : 'No'}</p>
        {session && (
          <div className="mt-3 bg-white p-3 rounded">
            <p><strong>User:</strong> {JSON.stringify(session.user, null, 2)}</p>
            <p><strong>Expires:</strong> {session.expires}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-100 p-4 rounded mb-6">
        <h2 className="font-semibold text-lg mb-3">API Test Response</h2>
        {testError && <p className="text-red-600">Error: {testError}</p>}
        {testResponse && (
          <pre className="bg-white p-3 rounded overflow-auto text-sm">
            {JSON.stringify(testResponse, null, 2)}
          </pre>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <p className="text-sm">
          <strong>Next Steps:</strong>
          <ul className="list-disc ml-5 mt-2">
            <li>Check if "Status" shows "authenticated"</li>
            <li>Check if "Has Session" shows "Yes"</li>
            <li>Check the "API Test Response" to see if the session is available on the server</li>
            <li>Open DevTools (F12) and check the Console for detailed error messages</li>
          </ul>
        </p>
      </div>
    </div>
  );
}
