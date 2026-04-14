'use client';

import { useRouter } from 'next/navigation';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntries, useCreateEntry } from '@/domains/entries/hooks/use-entries';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EntriesPage() {
  const router = useRouter();
  const { data: entries, isLoading } = useEntries();
  const createEntry = useCreateEntry();

  const handleNew = () => {
    createEntry.mutate(
      { title: '', content: '' },
      { onSuccess: (entry) => router.push(`/entries/${entry.id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold text-text">
          My Journal
        </h1>
        <Button
          onClick={handleNew}
          disabled={createEntry.isPending}
          className="bg-accent text-white hover:bg-accent-hover"
        >
          <Plus className="size-4" data-icon="inline-start" />
          New Entry
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && entries?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <BookOpen className="size-12 text-text-muted mb-4" />
          <p className="text-text-muted mb-4">
            No entries yet. Start writing!
          </p>
          <Button
            onClick={handleNew}
            disabled={createEntry.isPending}
            className="bg-accent text-white hover:bg-accent-hover"
          >
            Write your first entry
          </Button>
        </div>
      )}

      {/* List */}
      {!isLoading && entries && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => router.push(`/entries/${entry.id}`)}
              className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-border/30 cursor-pointer"
            >
              <h2 className="font-serif text-base font-medium text-text truncate">
                {entry.title || 'Untitled'}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {formatDate(entry.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
