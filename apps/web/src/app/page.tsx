'use client';

import { LogIn } from 'lucide-react';

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-6">
        <div>
          <h1 className="font-serif text-4xl font-semibold text-text">
            LuminaLM
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Your personal journal with AI
          </p>
        </div>
        <a
          href={`${apiUrl}/auth/google`}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <LogIn className="size-4" />
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
