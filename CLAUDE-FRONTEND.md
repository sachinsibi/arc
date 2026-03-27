# Arc, Frontend

Owner: Akshay (Frontend + Design)

A reflective AI experience that helps people in life transitions rediscover their narrative, visualised as a living tree of decisions, turning points, and possible futures.

## Project Context

This is a one-day hackathon project for the "Creative Flourishing" track. The judging criteria are: Impact Potential, Technical Execution, Ethical Alignment, and Presentation. Every decision should be made through that lens. Ship a working demo, not a perfect product.

## Tech Stack (Frontend)

- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS for styling
- D3.js for the tree visualisation
- Framer Motion for animations and transitions
- Zustand for conversation state management
- Deployed on Vercel

## Your Files

You own everything except the API route handlers. Your teammate owns `app/api/`.

```
arc/
├── app/
│   ├── layout.tsx              # Root layout, fonts (Georgia/serif), metadata
│   ├── globals.css             # CSS custom properties, base styles, Tailwind
│   ├── page.tsx                # Landing page: tagline + "Begin" button
│   ├── chat/
│   │   └── page.tsx            # Guided conversation interface
│   ├── tree/
│   │   └── page.tsx            # Tree visualisation + narrative reflection
│   └── api/                    # ← DO NOT TOUCH. Backend team owns this.
│       ├── chat/
│       │   └── route.ts
│       └── extract/
│           └── route.ts
├── components/
│   ├── ChatMessage.tsx         # Single message (no speech bubbles, just text)
│   ├── ChatInput.tsx           # Text input with thin bottom border + send arrow
│   ├── LifeTree.tsx            # D3.js tree visualisation component
│   ├── TreeNode.tsx            # Individual interactive node on the tree
│   ├── NarrativeReflection.tsx # The written reflection below the tree
│   └── TransitionWrapper.tsx   # Framer Motion page transition wrapper
├── lib/
│   ├── types.ts                # SHARED: TypeScript interfaces (do not modify without syncing with backend)
│   ├── store.ts                # Zustand store (messages, tree data, phase tracking)
│   └── tree-layout.ts          # D3 tree layout calculations and helpers
├── public/
│   └── fonts/
├── CLAUDE.md
└── package.json
```

---

## Shared API Contract

**CRITICAL: This section is identical in both frontend and backend CLAUDE.md files. If either side changes the contract, both files must be updated.**

### Shared Types (lib/types.ts)

```typescript
export interface TreeNode {
  id: string;
  label: string;
  description: string;
}

export interface Leaf {
  id: string;
  content: string;
  reflection: string;
}

export interface Branch {
  id: string;
  label: string;
  description: string;
  thickness: number;       // 1-5, where 5 = most significant
  period: string;          // e.g. "Ages 15-18", "Early 20s"
  children: Branch[];
  leaves: Leaf[];
}

export interface LifeTree {
  roots: TreeNode[];
  trunk: TreeNode;
  branches: Branch[];
  buds: TreeNode[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type AppPhase = 'landing' | 'conversation' | 'tree';
```

### POST /api/chat

- **You send:** `{ messages: Message[] }` (full conversation history)
- **You receive:** A streaming text response (ReadableStream). Use the Vercel AI SDK's `useChat` hook or manually consume the stream.
- The backend applies the system prompt. You do not need to include it.

### POST /api/extract

- **You send:** `{ messages: Message[] }` (full conversation transcript)
- **You receive:** `{ tree: LifeTree, narrative: string }`
- This is NOT a streaming endpoint. It returns a single JSON response when both the tree extraction and narrative synthesis are complete. Expect 5 to 15 seconds of latency.

### The Opening Question

The very first message in the chat is shown by the frontend, not sent by the API. Display this as Arc's first message:

> "Think back to when you were around 14 or 15. What did you spend your time on, not because anyone told you to, but because you genuinely wanted to?"

The user's first typed response is then sent to `/api/chat` as the first user message. The backend knows this context and will not repeat the question.

---

## Design System

### Colour Palette

The palette is near-monochrome. Black, white, and grey do 95% of the work. Colour appears only on the tree visualisation itself, and even there it is muted and restrained. Reference: born.com (pure white, black type, silver secondary text) and chloeyan.me (white, monospace, hairline rules).

Define these as CSS custom properties in `app/globals.css`:

```css
:root {
  --bg: #FFFFFF;
  --bg-secondary: #FAFAFA;
  --text-primary: #111111;
  --text-secondary: #6B6B6B;
  --text-muted: #ADADAD;
  --border: #E5E5E5;
  --accent: #1A1A1A;

  /* Tree-only colours. These appear ONLY in the D3 visualisation, nowhere else in the UI. */
  --tree-trunk: #2C2C2C;
  --tree-branch: #555555;
  --tree-branch-light: #888888;
  --tree-leaf: #3D5A3D;
  --tree-bud: #C17F3A;
  --tree-root: #BBBBBB;
}
```

Also register these in `tailwind.config.ts` so you can use them as Tailwind classes:

```typescript
theme: {
  extend: {
    colors: {
      bg: 'var(--bg)',
      'bg-secondary': 'var(--bg-secondary)',
      'text-primary': 'var(--text-primary)',
      'text-secondary': 'var(--text-secondary)',
      'text-muted': 'var(--text-muted)',
      border: 'var(--border)',
      accent: 'var(--accent)',
    },
  },
}
```

### Typography

- Headings: Georgia, serif, tracked slightly wide (letter-spacing: 0.01em)
- Body: Georgia, serif for narrative text and conversation
- UI labels, timestamps, progress indicators: system sans-serif (font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif) at small sizes for contrast with the serif body
- The tagline on the landing page should be large (clamp(2rem, 5vw, 3.5rem)), centred, with generous line-height (1.4)
- The app should feel like a well-designed book, not a SaaS dashboard. But a modern book, not an antique one.
- Use `next/font` to load Georgia or fallback to the system serif stack.

### Visual Principles

- Almost everything is black and white. Colour is earned, not given. The only chromatic colour in the entire UI appears on the tree (green leaves, amber buds). This makes the tree feel alive against a monochrome world.
- Stillness over stimulation. Generous whitespace. No visual clutter.
- One thing at a time. The landing page shows one line and one button. The chat shows one message at a time appearing. The tree reveals branch by branch.
- Use hairline rules (1px, #E5E5E5) as dividers, like chloeyan.me. No thick borders, no boxes.
- All transitions should be slow and deliberate (300ms to 600ms). Nothing should snap or pop.
- No shadows, no border-radius on cards, no gradients. Let whitespace do the structural work.
- Buttons are minimal: black text with a subtle underline or a thin black border. The "Begin" button on the landing page is a simple outlined rectangle with black border, black text, no fill. On hover, it fills black with white text. That is the only hover effect in the app.
- The chat interface should feel like a text document, not a messaging app. No speech bubbles. No coloured backgrounds on messages. Just text, left-aligned for Arc, right-aligned for the user, separated by whitespace.

---

## Pages

### Phase 1: Landing (`/`)

A centred layout with generous vertical spacing. The tagline "Every life has an arc. Let's find yours." in Georgia, --text-primary, large scale (clamp(2rem, 5vw, 3.5rem)). A single "Begin" button below it: thin black border, no fill, Georgia text. On hover, fills black with white text. Nothing else on the page. No logo, no navigation, no footer. Just the line and the button, centred vertically and horizontally. Clicking "Begin" navigates to `/chat` with a slow fade transition.

### Phase 2: Conversation (`/chat`)

**UI structure:**
- Display Arc's opening question as the first message (hardcoded, not from the API).
- Messages appear one at a time with a subtle fade-in (Framer Motion, 300ms, opacity 0 to 1, translateY 8px to 0).
- Arc's messages are left-aligned, user messages are right-aligned. No speech bubbles. No coloured backgrounds. Just text separated by whitespace, like a screenplay or a written dialogue.
- Arc's messages are in --text-secondary (mid-grey). User messages are in --text-primary (near-black). This subtle contrast is the only visual distinction.
- A simple text input at the bottom: a single line with a thin bottom border, no box, no background. A small send arrow in --text-muted that darkens on hover. No emoji pickers, no attachments, no formatting tools.
- A small progress indicator (not a progress bar, something subtle like "3 of ~10" in --text-muted, system sans-serif, small size) so the user knows the conversation has a shape.
- While Arc is responding (streaming), show a subtle pulsing ellipsis or nothing at all. No "typing..." indicator with bouncing dots.

**State management:**
- Use the Zustand store to track messages, exchangeCount, and phase.
- After each assistant response, increment exchangeCount.
- When exchangeCount reaches 8 to 12, the backend will naturally steer towards closing. When the user confirms they want to see their tree, navigate to `/tree`.
- Pass the full messages array to `/api/chat` on each send. The backend handles the system prompt.

**Streaming:**
- Use the Vercel AI SDK's `useChat` hook if it fits, or consume the ReadableStream manually.
- Append tokens to the current assistant message as they arrive.

### Phase 3: Tree + Reflection (`/tree`)

**Loading state:**
- On mount, send the full conversation transcript (from Zustand store) to `/api/extract`.
- Show a loading state. Centred text in Georgia, --text-muted: "Growing your tree..." with a subtle opacity pulse animation (0.4 to 1.0, 2s ease-in-out, infinite). Nothing else on screen.
- Expect 5 to 15 seconds. Do not show a progress bar or percentage.

**Tree visualisation:**
- When the response arrives, store the tree and narrative in Zustand, then render the LifeTree component.
- The tree grows in animated, branch by branch, over 3 to 5 seconds.
- After the tree finishes, fade in the NarrativeReflection below it.

**Narrative reflection:**
- Georgia, serif. Generous line-height (1.6 to 1.8). Max-width 680px. Centred on page.
- The reflection fades in after the tree has finished growing (use a delayed Framer Motion animation).
- The final line of the reflection must always be: "This is one way to read your arc. You might see it differently. The story is yours to tell."

---

## Zustand Store

Define in `lib/store.ts`:

```typescript
import { create } from 'zustand';
import { AppPhase, Message, LifeTree } from './types';

interface ArcStore {
  phase: AppPhase;
  messages: Message[];
  tree: LifeTree | null;
  narrative: string | null;
  isLoading: boolean;
  exchangeCount: number;

  setPhase: (phase: AppPhase) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setTree: (tree: LifeTree) => void;
  setNarrative: (narrative: string) => void;
  setLoading: (loading: boolean) => void;
  incrementExchange: () => void;
  reset: () => void;
}

export const useArcStore = create<ArcStore>((set) => ({
  phase: 'landing',
  messages: [],
  tree: null,
  narrative: null,
  isLoading: false,
  exchangeCount: 0,

  setPhase: (phase) => set({ phase }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setTree: (tree) => set({ tree }),
  setNarrative: (narrative) => set({ narrative }),
  setLoading: (loading) => set({ isLoading: loading }),
  incrementExchange: () => set((state) => ({ exchangeCount: state.exchangeCount + 1 })),
  reset: () => set({ phase: 'landing', messages: [], tree: null, narrative: null, isLoading: false, exchangeCount: 0 }),
}));
```

---

## The Tree Visualisation (D3.js)

This is the hardest technical component and the visual centrepiece of the demo. It must feel organic, not mechanical.

### Approach

1. Use `d3.tree()` or `d3.cluster()` for the base layout, but apply custom positioning to make it feel organic rather than geometric. Add slight random offsets to node positions.
2. Draw branches as curved SVG paths using `d3.linkRadial()` or custom bezier curves. Straight lines will look like an org chart.
3. Vary stroke-width based on `branch.thickness`. Use a scale from 2px to 8px.
4. Animate the tree growing in using Framer Motion or D3 transitions. Each branch should draw in sequentially, following the chronological order of the user's story. Use SVG `stroke-dasharray` and `stroke-dashoffset` for the drawing effect.
5. Colour mapping:
   - Trunk: near-black (#2C2C2C)
   - Primary branches: dark grey (#555555)
   - Thinner/pruned branches: mid-grey (#888888)
   - Roots: light grey (#BBBBBB, ethereal and faded)
   - Leaves: small circles in muted deep green (#3D5A3D). This is the only true colour in the app.
   - Buds: warm amber (#C17F3A). The single warm accent.
   - This monochrome-with-two-accents approach makes the tree feel like an ink drawing where colour is used only for what is alive or possible.
6. On click, show a tooltip or side panel with the node's label, description, and reflection. Style the tooltip as a simple white panel with a thin border, Georgia text, no shadow.
7. Make the SVG responsive: use viewBox and allow zoom/pan on mobile via d3-zoom.

### Data Transformation

The LifeTree data from the API needs to be transformed into a D3-compatible hierarchy. Build a helper in `lib/tree-layout.ts`:

```typescript
// Convert LifeTree to a D3-compatible hierarchy
// Roots go below the trunk, branches go above, buds at the tips
// The trunk is the root node of the hierarchy
export function treeToHierarchy(tree: LifeTree): d3.HierarchyNode<any> {
  // Build a tree structure with trunk as root
  // branches as children, leaves as terminal nodes
  // roots rendered separately below
  // buds rendered as special terminal nodes
}
```

---

## Page Transitions

Use Framer Motion for transitions between routes:

- Landing to Chat: slow fade (600ms, ease-in-out)
- Chat to Tree: slow fade (600ms, ease-in-out)
- Wrap page content in a TransitionWrapper component using `AnimatePresence` and `motion.div`

---

## Critical Rules

### Do Not

- Do not add authentication or user accounts. This is a single-session demo.
- Do not add a landing page feature tour, onboarding wizard, or any explanatory UI.
- Do not use shadows, rounded corners on containers, or gradient backgrounds.
- Do not add sound effects, haptic feedback, or any sensory gimmick.
- Do not use any UI component library (no shadcn, no MUI, no Chakra). Build from scratch with Tailwind.
- Do not touch anything in `app/api/`. That is the backend team's territory.

### Do

- Use TypeScript strictly. Define interfaces for everything.
- Handle loading states thoughtfully. "Growing your tree..." not a spinner.
- Make the tree the visual centrepiece.
- Keep the first message experience tight: user lands, reads one line, clicks one button, sees one question. Three seconds to engagement.
- All text content should use British English spelling (colour, visualise, organisation).

---

## Build Order

1. Set up the project scaffold: Next.js + TypeScript + Tailwind + globals.css with CSS custom properties
2. Create `lib/types.ts` (shared types) and `lib/store.ts` (Zustand)
3. Build the landing page (`/`) with the tagline and Begin button
4. Build the chat UI at `/chat` with message display and input
5. Wire up to `/api/chat` (the backend will have this ready). Test streaming.
6. Build the tree page (`/tree`) loading state
7. Build the LifeTree component with D3.js (start with a static render using mock data, then add animation)
8. Wire up to `/api/extract` and render real tree data
9. Build the NarrativeReflection component
10. Add page transitions with Framer Motion
11. Polish: typography, spacing, responsive design

**Tip for parallel development:** While waiting for the backend API routes, use mock data. Create a `lib/mock-data.ts` file with a hardcoded LifeTree and narrative string so you can build and style the tree page independently.
