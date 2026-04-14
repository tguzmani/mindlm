const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const TOKEN_KEY = 'luminalm_token';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let message: string;
    try {
      message = JSON.parse(body).message ?? body;
    } catch {
      message = body;
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// --- Types (mirrored from backend DTOs) ---

export interface EntryResponseDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  collectionId: string | null;
}

export interface EntryDetailDto extends EntryResponseDto {
  content: string;
}

export interface CreateEntryDto {
  title: string;
  content: string;
  collectionId?: string;
}

export interface UpdateEntryDto {
  title?: string;
  content?: string;
}

// --- Entries API ---

export function getEntries(): Promise<EntryResponseDto[]> {
  return apiFetch('/entries');
}

export function getEntry(id: string): Promise<EntryDetailDto> {
  return apiFetch(`/entries/${id}`);
}

export function createEntry(dto: CreateEntryDto): Promise<EntryDetailDto> {
  return apiFetch('/entries', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function updateEntry(
  id: string,
  dto: UpdateEntryDto,
): Promise<EntryDetailDto> {
  return apiFetch(`/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export function deleteEntry(id: string): Promise<void> {
  return apiFetch(`/entries/${id}`, {
    method: 'DELETE',
  });
}

// --- Chat types ---

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ConversationWithMessages {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  messages: ConversationMessage[];
}

// --- Chat API ---

export function getConversation(): Promise<ConversationWithMessages> {
  return apiFetch('/conversations/me');
}

export async function sendMessage(
  message: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): Promise<void> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Chat request failed: ${res.status}`);
    }

    if (!res.body) {
      throw new Error('Response body is null');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);

        if (data === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (typeof parsed === 'string') {
            onToken(parsed);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Stream ended without [DONE]
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Unknown error'));
  }
}
