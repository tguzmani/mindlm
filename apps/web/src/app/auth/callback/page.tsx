'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('luminalm_token', token);
      document.cookie = `luminalm_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      router.replace('/entries');
    } else {
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-text-muted">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-text-muted">Signing you in...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
