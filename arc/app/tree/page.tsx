'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useArcStore } from '@/lib/store';
import LifeTree from '@/components/LifeTree';
import NarrativeReflection from '@/components/NarrativeReflection';
import { mockTree, mockNarrative } from '@/lib/mock-data';

// Strip em dashes from all string values recursively
function stripEmDashes(text: string): string {
  return text.replace(/\u2014/g, ', ').replace(/\u2013/g, ', ');
}

function cleanTreeData<T>(obj: T): T {
  if (typeof obj === 'string') return stripEmDashes(obj) as T;
  if (Array.isArray(obj)) return obj.map(cleanTreeData) as T;
  if (obj && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = cleanTreeData(v);
    }
    return cleaned as T;
  }
  return obj;
}

export default function TreePage() {
  const router = useRouter();
  const { tree, narrative, setTree, setNarrative, isLoading, setLoading } =
    useArcStore();
  const [treeGrown, setTreeGrown] = useState(false);
  const [error, setError] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;

    // Wait for persist hydration before reading store
    const run = () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      const state = useArcStore.getState();
      const currentMessages = state.messages;

      // If tree is already loaded, skip fetch
      if (state.tree && state.narrative) return;

      // If no conversation happened, use mock data
      if (currentMessages.length === 0) {
        setTree(mockTree);
        setNarrative(mockNarrative);
        return;
      }

      async function fetchTreeData() {
        setLoading(true);
        try {
          const res = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: currentMessages }),
          });

          if (!res.ok) throw new Error('Extract failed');

          const data = await res.json();
          setTree(cleanTreeData(data.tree));
          setNarrative(stripEmDashes(data.narrative));
        } catch {
          setTree(mockTree);
          setNarrative(mockNarrative);
          setError(true);
        } finally {
          setLoading(false);
        }
      }

      fetchTreeData();
    };

    if (useArcStore.persist.hasHydrated()) {
      run();
    } else {
      const unsub = useArcStore.persist.onFinishHydration(() => {
        run();
        unsub();
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (isLoading || (!tree && !error)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted animate-pulse-opacity text-lg">
          Growing your tree...
        </p>
      </div>
    );
  }

  const displayTree = tree ?? mockTree;
  const displayNarrative = narrative ?? mockNarrative;

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    const treeDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    const currentIntention = useArcStore.getState().intention;
    const paragraphs = displayNarrative.split('\n\n').filter(Boolean);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Clearing</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  @page { margin: 40px; }
  body {
    font-family: Georgia, 'Times New Roman', Times, serif;
    color: #111111;
    background: #FAF7F2;
    max-width: 760px;
    margin: 0 auto;
    padding: 60px 40px;
    -webkit-font-smoothing: antialiased;
  }
  .header {
    text-align: center;
    margin-bottom: 50px;
    padding-bottom: 40px;
    border-bottom: 1px solid #E5E5E5;
  }
  .header h1 {
    font-size: 1.8rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: #111111;
    margin-bottom: 6px;
  }
  .header p {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 0.7rem;
    color: #ADADAD;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .tree-image {
    text-align: center;
    margin: 40px 0 50px;
  }
  .tree-image img {
    max-width: 100%;
    height: auto;
  }
  .divider {
    border: none;
    border-top: 1px solid #E5E5E5;
    margin: 40px 0;
  }
  .narrative p {
    font-size: 1rem;
    line-height: 1.75;
    color: #111111;
    margin-bottom: 1.4em;
  }
  .intention {
    text-align: center;
    margin-top: 50px;
    padding-top: 40px;
    border-top: 1px solid #E5E5E5;
  }
  .intention-label {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 0.65rem;
    color: #ADADAD;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
  }
  .intention-text {
    font-size: 1.1rem;
    font-style: italic;
    color: #111111;
    line-height: 1.6;
  }
  .footer {
    text-align: center;
    margin-top: 60px;
    padding-top: 30px;
    border-top: 1px solid #E5E5E5;
  }
  .footer p {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 0.65rem;
    color: #CCCCCC;
    letter-spacing: 0.05em;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Your Clearing</h1>
    <p>A reflection</p>
  </div>

  ${treeDataUrl ? `<div class="tree-image"><img src="${treeDataUrl}" alt="Life tree visualisation" /></div><hr class="divider" />` : ''}

  <div class="narrative">
    ${paragraphs.map((p: string) => `<p>${p}</p>`).join('\n    ')}
  </div>

  ${currentIntention ? `
  <div class="intention">
    <p class="intention-label">Your intention</p>
    <p class="intention-text">&ldquo;${currentIntention}&rdquo;</p>
  </div>` : ''}

  <div class="footer">
    <p>Planted in the Clearing &bull; ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'my-clearing.html';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-12">
      {/* Tree */}
      <div className="mx-auto" style={{ maxWidth: '900px' }}>
        <LifeTree tree={displayTree} onGrowComplete={() => setTreeGrown(true)} />
      </div>

      {/* Divider */}
      <div className="mx-auto my-12" style={{ maxWidth: '680px' }}>
        <hr
          className="border-0"
          style={{ borderTop: '1px solid var(--border)' }}
        />
      </div>

      {/* Narrative */}
      <NarrativeReflection narrative={displayNarrative} visible={treeGrown} />

      {/* Export buttons */}
      {treeGrown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center justify-center gap-6 py-12"
        >
          <button
            onClick={handleExport}
            className="px-6 py-2 border border-accent bg-transparent text-text-primary cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent hover:text-white"
            style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem' }}
          >
            Save your clearing
          </button>
          <button
            onClick={() => window.open('https://buy.stripe.com/test_placeholder', '_blank')}
            className="font-ui text-text-muted hover:text-text-primary cursor-pointer transition-colors duration-300"
            style={{ fontSize: '0.75rem', background: 'none', border: 'none' }}
          >
            Order an Archival Print ($15)
          </button>
        </motion.div>
      )}
    </div>
  );
}
