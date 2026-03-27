'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useArcStore } from '@/lib/store';
import LifeTree from '@/components/LifeTree';
import NarrativeReflection from '@/components/NarrativeReflection';
import { mockTree, mockNarrative } from '@/lib/mock-data';

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
        setTree(data.tree);
        setNarrative(data.narrative);
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
    </div>
  );
}
