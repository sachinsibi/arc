'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { HierarchyData } from '@/lib/tree-layout';

interface TreeNodeProps {
  node: HierarchyData | null;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function TreeNode({ node, position, onClose }: TreeNodeProps) {
  if (!node) return null;

  const isLeaf = node.type === 'leaf';
  const isBud = node.type === 'bud';
  const isRoot = node.type === 'root';

  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 px-5 py-4"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              boxShadow: '2px 4px 12px rgba(0,0,0,0.05)',
              transform: 'rotate(-1deg)',
              maxWidth: '280px',
              left: `${Math.min(position.x, window.innerWidth - 300)}px`,
              top: `${Math.min(position.y + 12, window.innerHeight - 200)}px`,
            }}
          >
            <p className="text-sm font-bold text-text-primary mb-1">
              {node.label}
            </p>
            {node.period && (
              <p className="font-ui text-text-muted mb-2" style={{ fontSize: '0.7rem' }}>
                {node.period}
              </p>
            )}
            <p className="text-sm text-text-secondary leading-[1.5]">
              {node.description}
            </p>
            {isLeaf && node.reflection && (
              <p
                className="mt-2 text-sm leading-[1.5]"
                style={{ color: 'var(--tree-leaf)', fontStyle: 'italic' }}
              >
                {node.reflection}
              </p>
            )}
            {isBud && (
              <p
                className="mt-1 font-ui"
                style={{ color: 'var(--tree-bud)', fontSize: '0.7rem' }}
              >
                Possible future
              </p>
            )}
            {isRoot && (
              <p
                className="mt-1 font-ui"
                style={{ color: 'var(--tree-root)', fontSize: '0.7rem' }}
              >
                Core value
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
