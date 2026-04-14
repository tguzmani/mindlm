'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayoutStore } from '@/lib/stores/layout-store';
import { useConversation, useSendMessage } from '@/domains/chat/hooks/use-chat';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const { chatPanelOpen, setChatPanelOpen } = useLayoutStore();
  const { data: conversation, isLoading, isError } = useConversation();
  const {
    send,
    streamingContent,
    isStreaming,
    error,
    clearError,
    optimisticMessages,
  } = useSendMessage();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Combine server messages + optimistic messages
  const allMessages = useMemo(() => {
    const serverMessages = conversation?.messages ?? [];
    return [...serverMessages, ...optimisticMessages];
  }, [conversation?.messages, optimisticMessages]);

  // Auto-scroll on new messages or streaming tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, streamingContent]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    send(trimmed);
    setInput('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop on mobile */}
      {chatPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setChatPanelOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-background shadow-lg transition-transform duration-200 ease-in-out',
          'w-full md:w-[400px]',
          chatPanelOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-serif text-lg font-semibold text-accent">
            LuminaLM
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setChatPanelOpen(false)}
            aria-label="Close chat"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="ml-auto h-8 w-2/3" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          )}

          {/* Error loading conversation */}
          {isError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              Failed to load conversation
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && allMessages.length === 0 && !streamingContent && (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-text-muted">
                Ask anything about your journal entries.
                <br />
                Your AI assistant will answer based on what you&apos;ve written.
              </p>
            </div>
          )}

          {/* Messages */}
          {allMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'ml-auto bg-accent text-white'
                  : 'mr-auto bg-surface text-text',
              )}
            >
              {msg.content}
            </div>
          ))}

          {/* Streaming assistant message */}
          {streamingContent && (
            <div className="mr-auto max-w-[85%] rounded-lg bg-surface px-3 py-2 text-sm text-text">
              {streamingContent}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-accent" />
            </div>
          )}

          {/* Streaming indicator when waiting for first token */}
          {isStreaming && !streamingContent && (
            <div className="mr-auto flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-sm text-text-muted">
              <Loader2 className="size-3 animate-spin" />
              Thinking...
            </div>
          )}

          {/* Inline error from send */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={clearError}
                className="text-destructive"
              >
                Dismiss
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your journal..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <Button
              variant="default"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              className="bg-accent text-white hover:bg-accent-hover"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
