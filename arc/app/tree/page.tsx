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
    // PNG export
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'my-arc.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    // Text export
    const currentIntention = useArcStore.getState().intention;
    let textContent = displayNarrative;
    if (currentIntention) {
      textContent += '\n\n---\n\nYour intention: "' + currentIntention + '"';
    }
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'my-arc.txt';
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
