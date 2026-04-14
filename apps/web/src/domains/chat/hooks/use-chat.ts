import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConversation,
  sendMessage,
  ConversationMessage,
} from '@/lib/api';
import { useLayoutStore } from '@/lib/stores/layout-store';

const CONVERSATION_KEY = ['conversation'] as const;

export function useConversation() {
  const chatPanelOpen = useLayoutStore((s) => s.chatPanelOpen);

  return useQuery({
    queryKey: CONVERSATION_KEY,
    queryFn: getConversation,
    enabled: chatPanelOpen,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<
    ConversationMessage[]
  >([]);
  const streamingRef = useRef('');

  const send = useCallback(
    (message: string) => {
      setError(null);
      setIsStreaming(true);
      setStreamingContent('');
      streamingRef.current = '';

      // Add optimistic user message
      const userMsg: ConversationMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      };
      setOptimisticMessages((prev) => [...prev, userMsg]);

      sendMessage(
        message,
        (token) => {
          streamingRef.current += token;
          setStreamingContent(streamingRef.current);
        },
        () => {
          setIsStreaming(false);
          setStreamingContent('');
          setOptimisticMessages([]);
          streamingRef.current = '';
          queryClient.invalidateQueries({ queryKey: CONVERSATION_KEY });
        },
        (err) => {
          setIsStreaming(false);
          setStreamingContent('');
          streamingRef.current = '';
          setError(err.message);
        },
      );
    },
    [queryClient],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    send,
    streamingContent,
    isStreaming,
    error,
    clearError,
    optimisticMessages,
  };
}
