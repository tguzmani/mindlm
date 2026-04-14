# MindLM — CLAUDE.md

## What is MindLM?

A personal journal app with AI. Users write markdown entries and can chat with their own content via RAG (Retrieval-Augmented Generation). The LLM answers questions grounded in the user's own journal entries.

---

## Monorepo Structure (NX)

```
apps/
  api/        ← NestJS backend
  web/        ← Next.js frontend
libs/         ← shared types, DTOs (if needed)
```

---

## Backend — NestJS (Domain-Driven)

### Domains

```
src/
  auth/
  entries/
  collections/       ← v2, scaffold from day one
  search/            ← RAG orchestrator, no DB of its own
  chat/
  conversations/
  common/
    openrouter/
      openrouter.service.ts     ← LLM completions + streaming
      embeddings.service.ts     ← vector embeddings
      interfaces/
        llm.interface.ts
        embedding.interface.ts
    prompt/
      prompt.builder.ts         ← Builder pattern for context engineering
      prompt.types.ts
```

### Domain Rules

- Each domain owns its own module, service, controller, and repository.
- No domain imports directly from another domain's internals. Use injected services.
- `common/` is the only place that talks to OpenRouter. All other services call `common/`.
- `search/` is an orchestrator: it calls `entries/` and `collections/` to retrieve chunks, then combines results. It has no DB tables of its own.

---

## Database — Supabase + Prisma + pgvector

### Setup

- Enable pgvector extension in Supabase SQL editor before running migrations:

```sql
create extension if not exists vector;
```

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String
  avatarUrl     String?
  googleId      String         @unique
  role          UserRole       @default(user)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  collections   Collection[]
  entries       Entry[]
  conversations Conversation[]
}

model Collection {
  id          String    @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  userId      String
  user        User      @relation(fields: [userId], references: [id])
  entries     Entry[]
}

model Entry {
  id           String       @id @default(uuid())
  title        String
  content      String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  userId       String
  user         User         @relation(fields: [userId], references: [id])
  collectionId String?
  collection   Collection?  @relation(fields: [collectionId], references: [id])
  chunks       EntryChunk[]
}

model EntryChunk {
  id         String                      @id @default(uuid())
  content    String
  chunkIndex Int
  embedding  Unsupported("vector(1536)")?
  createdAt  DateTime                    @default(now())

  entryId    String
  entry      Entry  @relation(fields: [entryId], references: [id], onDelete: Cascade)
}

model Conversation {
  id        String    @id @default(uuid())
  title     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
}

model Message {
  id             String       @id @default(uuid())
  role           MessageRole
  content        String
  createdAt      DateTime     @default(now())

  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}

enum MessageRole {
  user
  assistant
}

enum UserRole {
  admin
  user
}

model AppConfig {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

### pgvector Similarity Search

Prisma does not support vector operations natively. Use `$queryRaw`:

```typescript
const similar = await this.prisma.$queryRaw`
  SELECT id, content, chunk_index,
         1 - (embedding <=> ${queryVector}::vector) as similarity
  FROM entry_chunks
  WHERE entry_id IN (
    SELECT id FROM entries WHERE user_id = ${userId}
  )
  ORDER BY embedding <=> ${queryVector}::vector
  LIMIT 5
`
```

---

## RAG Pipeline

### Indexing Flow (on entry save/edit)

```
User saves entry
→ entries.service saves Entry to DB
→ entries.service deletes all existing EntryChunks for that entry (delete + recreate)
→ entries.service chunks the content (500 words, 50 word overlap)
→ for each chunk → common/embeddings.service → OpenRouter /embeddings
→ saves each EntryChunk with its embedding vector
```

Re-chunking is always delete + recreate. Never update chunks in place.

### Query Flow (on user chat message)

```
User sends message
→ chat.service fetches the user's single global Conversation (creates if not exists)
→ conversations.service fetches last 10 Messages
→ search.service embeds the user query via common/embeddings.service
→ search.service runs similarity search against EntryChunks (pgvector)
→ returns top 5 most relevant chunks
→ chat.service builds prompt via PromptBuilder
→ chat.service calls common/openrouter.service with streaming
→ streams response token by token to frontend via SSE
→ on stream end, saves user message + assistant response to Conversation
```

---

## Context Engineering & Prompt Builder

Prompt order matters to avoid the "lost-in-the-middle" problem:

```
[SYSTEM]           ← critical instructions, always first
[RELEVANT CHUNKS]  ← most relevant first, least relevant in the middle
[CONVERSATION]     ← last 10 messages
[USER QUERY]       ← always last
```

### PromptBuilder (Builder Pattern)

Lives in `common/prompt/prompt.builder.ts`.

```typescript
const prompt = new PromptBuilder()
  .setSystem(
    'You are a personal assistant that helps the user reflect on their journal. Answer only based on the provided context. If the context does not contain the answer, say so.',
  )
  .setRelevantChunks(relevantChunks) // ordered by similarity score desc
  .setConversationHistory(lastMessages) // last 10 messages
  .setUserQuery(userQuery)
  .build()
```

Rules:

- `chat.service` always uses PromptBuilder. Never build prompts inline.
- Context engineering logic (ordering, formatting) lives inside PromptBuilder only.
- Never use raw template strings to build prompts outside of PromptBuilder.

---

## Auth

- Google OAuth via Passport.js (`passport-google-oauth20`)
- JWT for session management after OAuth callback
- Guard all routes except `/auth/google` and `/auth/google/callback`

---

## External Services — OpenRouter

- Base URL: `https://openrouter.ai/api/v1`
- LLM model and embedding model are stored in `AppConfig` table — never hardcoded
- `common/openrouter/` reads model values from DB at runtime via AppConfig keys:
  - `llm_model` → used for chat completions
  - `embedding_model` → used for embeddings
- Single API key for both completions and embeddings
- All calls go through `common/openrouter/` — never call OpenRouter directly from domain services

### Seed (prisma/seed.ts)

```typescript
await prisma.appConfig.createMany({
  data: [
    { key: 'llm_model', value: 'google/gemini-flash-1.5' },
    { key: 'embedding_model', value: 'openai/text-embedding-3-small' },
  ],
})
```

Admin UI to edit these values is out of scope for MVP. Change values directly in Supabase dashboard.

---

## Frontend — Next.js (Domain-Driven)

### Structure

```
src/
  app/                    ← Next.js App Router
  domains/
    auth/
    entries/
    chat/
    collections/          ← v2
  components/
    ui/                   ← shadcn/ui components
    layout/
      Sidebar.tsx         ← collapsible sidebar
      ChatPanel.tsx       ← right-side chat panel
      ThemeToggle.tsx
```

### Domain Rules

- Each domain folder contains its own components, hooks, and types.
- No cross-domain imports. Data flows through props or global state (Zustand or React Context).

---

## UI & Design System

### Component Library

- **shadcn/ui** with Tailwind CSS
- Headless, fully customizable

### Typography

- **Lora** (Google Fonts) — serif, elegant, for headings and entry content
- UI elements (buttons, labels, nav) use system sans-serif

### Color Palette

#### Light Mode

```
background:   #FAF7F2   (warm cream)
surface:      #F0EBE3   (soft linen)
border:       #DDD5C8   (warm gray)
text:         #2C2416   (dark brown)
text-muted:   #8C7B6B   (warm taupe)
accent:       #7A8C6E   (sage green)
accent-hover: #637357   (dark sage)
```

#### Dark Mode

```
background:   #1C1A17   (deep warm black)
surface:      #252320   (dark brown-black)
border:       #3A352E   (warm dark gray)
text:         #F0EBE3   (soft cream)
text-muted:   #8C7B6B   (warm taupe)
accent:       #7A8C6E   (sage green)
accent-hover: #8FA082   (light sage)
```

### Theme

- Dark/light toggle in sidebar footer
- Use `next-themes` for theme management
- Default: follows system preference

---

## Layout

### Desktop

- **Collapsible sidebar** on the left — collapses to icon-only on toggle
- Sidebar contains: entries list, collections (v2), chat toggle button, settings, theme toggle
- **Main content area** adapts width when sidebar collapses
- **Chat panel** slides in from the right as an overlay panel (does not push content)

### Mobile

- Sidebar becomes a **left drawer** (like Notion mobile) — triggered by hamburger icon in top navbar
- Top navbar shows: hamburger, app logo, chat toggle button, theme toggle
- Drawer overlays the content, closes on outside tap or swipe left
- Chat panel opens as full-width overlay on mobile

---

## Editor

- **Split view** on desktop: markdown editor on the left, rendered preview on the right
- Toolbar is hidden by default, appears on hover/focus
- Use `@uiw/react-md-editor` or `react-simplemde-editor`
- Preview renders with Lora font
- **Mobile**: split view collapses — only editor visible by default, preview accessible via tab toggle at the top of the editor

---

## Chat Panel (Frontend)

- **Placement:** fixed right-side panel, slides in over the content (does not push layout)
- **Trigger:** chat button in the sidebar (desktop) or top navbar (mobile)
- **Scope:** one global conversation per user — no conversation list, no history browser
- **Panel width:** ~400px on desktop, full width on mobile
- **UI structure:**
  - Header: "MindLM" title + close button
  - Messages area: scrollable, user messages right-aligned, assistant messages left-aligned
  - Streaming: assistant response appears token by token as it arrives via SSE
  - Input: textarea at the bottom + send button
  - Empty state: friendly prompt encouraging the user to ask about their journal
- **Streaming indicator:** show a pulsing cursor or typing indicator while the stream is in progress
- **On open:** fetch the existing conversation messages from the API and render them
- **Error handling:** show inline error if stream fails, allow retry

---

## Key Architectural Rules

1. **Domain-driven, not feature-driven.** Every file lives inside its domain.
2. **`common/` is the only OpenRouter gateway.** Domain services never import OpenRouter SDK directly.
3. **`search/` has no DB tables.** It orchestrates retrieval across domains.
4. **Prompt building happens only in PromptBuilder.** Never inline.
5. **Chunking is always delete + recreate.** On entry edit, delete all chunks and re-chunk from scratch.
6. **Streaming via SSE.** Chat responses stream token by token from NestJS to Next.js.
7. **Similarity search via raw SQL.** Prisma does not support pgvector natively.
8. **Conversation history capped at 10 messages.** Prevents context window overflow.
9. **One global conversation per user.** No multi-conversation UI in MVP.
10. **`collectionId` is nullable.** Entries can exist without a collection.
11. **`onDelete: Cascade` on EntryChunk.** Deleting an Entry deletes its chunks automatically.
12. **Mobile-first responsive.** Every component must work on mobile. Sidebar = drawer on mobile. Chat panel = full width on mobile. Editor = tab toggle on mobile.
13. **Model names come from AppConfig.** Never hardcode LLM or embedding model names. Read from DB via `AppConfig` keys `llm_model` and `embedding_model`.
14. **UserRole enum has two values: `admin` and `user`.** Default is `user`. Admin UI is out of scope for MVP.
