'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Users, CheckCircle, XCircle } from 'lucide-react';

/**
 * /teams/join?token=xxx — Team invite acceptance page.
 * Authenticated users land here after clicking an invite link.
 */

export default function JoinTeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [teamName, setTeamName] = useState('');
  const [role, setRole] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No invite token provided.');
      return;
    }

    async function join() {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setTeamName(data.teamName);
        setRole(data.role ?? 'member');
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? 'Failed to join team.');
      }
    }

    join();
  }, [token]);

  return (
    <div className="mx-auto max-w-md py-ds-12 text-center">
      {status === 'loading' && (
        <>
          <Users className="mx-auto h-10 w-10 text-brand-500 animate-pulse" />
          <p className="mt-ds-4 text-ds-sm text-gray-500">Joining team...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
            <CheckCircle className="h-7 w-7 text-green-500" />
          </div>
          <h2 className="mt-ds-4 text-ds-lg font-semibold text-gray-900">
            Welcome to {teamName}!
          </h2>
          <p className="mt-ds-2 text-ds-sm text-gray-500">
            You've joined as a {role}. You can now access shared workflows from this team.
          </p>
          <button
            onClick={() => router.push('/teams')}
            className="btn-primary mt-ds-6"
          >
            Go to Teams
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="mt-ds-4 text-ds-lg font-semibold text-gray-900">
            Could not join team
          </h2>
          <p className="mt-ds-2 text-ds-sm text-gray-500">{errorMsg}</p>
          <button
            onClick={() => router.push('/teams')}
            className="btn-secondary mt-ds-6"
          >
            Go to Teams
          </button>
        </>
      )}
    </div>
  );
}
