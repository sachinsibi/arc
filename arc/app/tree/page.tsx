'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useArcStore } from '@/lib/store';
import LifeTree from '@/components/LifeTree';
import NarrativeReflection from '@/components/NarrativeReflection';
import { mockTree, mockNarrative } from '@/lib/mock-data';
import { startAmbient, stopAmbient, isAmbientPlaying } from '@/lib/ambient';

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
  const [muted, setMuted] = useState(false);
  const hasFetched = useRef(false);

  // Start ambient audio when tree data is ready, stop on unmount
  useEffect(() => {
    if (tree && !muted) {
      startAmbient();
    }
    return () => stopAmbient();
  }, [tree, muted]);

  const toggleMute = () => {
    if (isAmbientPlaying()) {
      stopAmbient();
      setMuted(true);
    } else {
      startAmbient();
      setMuted(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // Read messages directly from store to avoid stale closure
    const currentMessages = useArcStore.getState().messages;

    // If no conversation happened, redirect to landing
    if (currentMessages.length === 0) {
      // Use mock data so the tree page is always testable
      setTree(mockTree);
      setNarrative(mockNarrative);
      return;
    }

    // If tree is already loaded, skip fetch
    if (tree && narrative) return;

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
        // Fallback to mock data for demo
        setTree(mockTree);
        setNarrative(mockNarrative);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchTreeData();
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
<title>My Arc</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  @page { margin: 40px; }
  body {
    font-family: Georgia, 'Times New Roman', Times, serif;
    color: #111111;
    background: #FFFFFF;
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
    <h1>Your Arc</h1>
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
    <p>Made with Arc</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'my-arc.html';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-12 relative">
      {/* Mute toggle — fixed bottom-right */}
      {tree && (
        <button
          onClick={toggleMute}
          className="fixed bottom-6 right-6 z-30 font-ui text-text-muted hover:text-text-primary transition-colors duration-300"
          style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}
          aria-label={muted ? 'Unmute ambient audio' : 'Mute ambient audio'}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14" />
              <path d="M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
      )}

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

      {/* Export button */}
      {treeGrown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex justify-center py-12"
        >
          <button
            onClick={handleExport}
            className="px-6 py-2 border border-accent bg-transparent text-text-primary cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent hover:text-white"
            style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem' }}
          >
            Save your arc
          </button>
        </motion.div>
      )}
    </div>
  );
}
