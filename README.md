# Arc

A reflective AI experience that helps people in life transitions rediscover their narrative, visualised as a living tree of decisions, turning points, and possible futures.

Built for the Claude Builder Hackathon — Creative Flourishing track.

## What it does

Arc guides you through a short conversation about your life story, then generates a visual tree of your decisions, turning points, and possible futures — alongside a reflective narrative that weaves it all together.

## Stack

- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS
- D3.js for the tree visualisation
- Framer Motion for animations
- Claude API via the Vercel AI SDK
- Zustand for state management
- Deployed on Vercel

## Getting started

```bash
cd arc
npm install
```

Create a `.env.local` file inside the `arc/` directory:

```
ANTHROPIC_API_KEY=your_key_here
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
arc/                    # Next.js app
├── app/
│   ├── page.tsx        # Landing page
│   ├── chat/           # Guided conversation
│   ├── tree/           # Tree visualisation + narrative
│   └── api/
│       ├── chat/       # Streaming conversation endpoint
│       └── extract/    # Tree extraction + narrative synthesis
├── components/         # UI components
└── lib/
    ├── prompts.ts      # Claude system prompts
    ├── types.ts        # Shared TypeScript interfaces
    ├── store.ts        # Zustand store
    └── tree-layout.ts  # D3 layout helpers
```
