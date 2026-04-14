'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  useEntry,
  useUpdateEntry,
  useDeleteEntry,
} from '@/domains/entries/hooks/use-entries';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

type SaveStatus = 'idle' | 'pending' | 'saved';

export default function EntryEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: entry, isLoading } = useEntry(params.id);
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from fetched entry
  useEffect(() => {
    if (entry && !initialized) {
      setTitle(entry.title);
      setContent(entry.content);
      setInitialized(true);
    }
  }, [entry, initialized]);

  // Auto-save with debounce
  const save = useCallback(
    (newTitle: string, newContent: string) => {
      if (!initialized) return;

      setSaveStatus('pending');

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        updateEntry.mutate(
          { id: params.id, dto: { title: newTitle, content: newContent } },
          {
            onSuccess: () => {
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 1500);
            },
            onError: () => setSaveStatus('idle'),
          },
        );
      }, 1000);
    },
    [initialized, params.id, updateEntry],
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    save(val, content);
  };

  const handleContentChange = (val: string | undefined) => {
    const newContent = val ?? '';
    setContent(newContent);
    save(title, newContent);
  };

  const handleDelete = () => {
    deleteEntry.mutate(params.id, {
      onSuccess: () => router.push('/entries'),
    });
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (!entry && initialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-muted">Entry not found</p>
      </div>
    );
  }

  const saveIndicator = (
    <span className="flex items-center gap-1 text-xs text-text-muted">
      {saveStatus === 'pending' && (
        <>
          <Loader2 className="size-3 animate-spin" />
          Saving...
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <Check className="size-3" />
          Saved
        </>
      )}
    </span>
  );

  const previewContent = (
    <div className="prose prose-sm prose-invert max-w-none font-serif p-4 prose-headings:text-text prose-p:text-text prose-strong:text-text prose-li:text-text prose-a:text-accent">
      {content ? (
        <ReactMarkdown>{content}</ReactMarkdown>
      ) : (
        <span className="text-text-muted">Nothing to preview</span>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/entries')}
          aria-label="Back to entries"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="flex-1 bg-transparent font-serif text-xl font-semibold text-text placeholder:text-text-muted outline-none"
        />

        {saveIndicator}

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Delete entry">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this entry and all its data. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEntry.isPending}
              >
                {deleteEntry.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Desktop: split view */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-12rem)]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <MDEditor
            value={content}
            onChange={handleContentChange}
            height="100%"
            preview="edit"
            hideToolbar
            visibleDragbar={false}
            data-color-mode="dark"
          />
        </div>
        <div className="overflow-y-auto rounded-lg border border-border bg-surface">
          {previewContent}
        </div>
      </div>

      {/* Mobile: tabbed view */}
      <div className="md:hidden">
        <Tabs defaultValue="write">
          <TabsList className="mb-4">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <div className="rounded-lg border border-border overflow-hidden">
              <MDEditor
                value={content}
                onChange={handleContentChange}
                height={400}
                preview="edit"
                hideToolbar
                visibleDragbar={false}
                data-color-mode="dark"
              />
            </div>
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[400px] rounded-lg border border-border bg-surface">
              {previewContent}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
