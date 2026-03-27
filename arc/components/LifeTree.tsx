'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeTree as LifeTreeType } from '@/lib/types';
import { HierarchyData } from '@/lib/tree-layout';

interface LifeTreeProps {
  tree: LifeTreeType;
  onGrowComplete?: () => void;
}

/* ================================================================== */
/*  Colour palettes                                                    */
/* ================================================================== */

const TREE_COLORS = ['#1a1a1a', '#2C2C2C', '#333333', '#252525', '#2f2f2f'];
const LEAF_COLORS = ['#355535', '#3D5A3D', '#4a6b4a', '#2d4a2d', '#3D5A3D'];
const BUD_COLORS = ['#B87030', '#C17F3A', '#D4944A', '#a86828'];
const ROOT_COLORS = ['#AAAAAA', '#BBBBBB', '#C5C5C5', '#B0B0B0'];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nodeColor(type: string): string {
  if (type === 'leaf') return '#3D5A3D';
  if (type === 'bud') return '#C17F3A';
  if (type === 'root') return '#BBBBBB';
  if (type === 'trunk') return '#2C2C2C';
  return '#555555';
}

/* ================================================================== */
/*  Recursive fractal tree generation (adapted from original)          */
/* ================================================================== */

interface Terminal {
  x: number;
  y: number;
  angle: number;
}

function generateRecursiveTree(
  x: number,
  y: number,
  angle: number,
  length: number,
  depth: number,
  targets: Array<{ x: number; y: number }>,
  terminals: Terminal[],
) {
  if (depth === 0) {
    terminals.push({ x, y, angle });
    return;
  }

  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;

  const steps = Math.max(4, Math.floor(length * 1.5));
  for (let i = 0; i <= steps; i++) {
    targets.push({
      x: x + (endX - x) * (i / steps),
      y: y + (endY - y) * (i / steps),
    });
  }

  const spread = 0.4 + (Math.random() * 0.12 - 0.06);
  const nextLength = length * (0.68 + Math.random() * 0.1);

  generateRecursiveTree(endX, endY, angle - spread, nextLength, depth - 1, targets, terminals);
  generateRecursiveTree(endX, endY, angle + spread, nextLength, depth - 1, targets, terminals);
}

/* ================================================================== */
/*  Annotation layout                                                  */
/* ================================================================== */

interface Annotation {
  treeX: number;
  treeY: number;
  labelX: number;
  labelY: number;
  side: 'left' | 'right';
  data: HierarchyData;
  leaves?: Array<{ content: string; reflection: string }>;
}

function computeAnnotations(
  tree: LifeTreeType,
  terminals: Terminal[],
  rootAnchors: Array<{ x: number; y: number; data: HierarchyData }>,
  cx: number,
  w: number,
  h: number,
): Annotation[] {
  const annotations: Annotation[] = [];

  // Sort terminals by angle for sector assignment
  const sorted = [...terminals].sort((a, b) => a.angle - b.angle);
  const items = [
    ...tree.branches.map((b) => ({
      data: {
        id: b.id,
        label: b.label,
        description: b.description,
        type: 'branch' as const,
        thickness: b.thickness,
        period: b.period,
      },
      leaves: b.leaves.map((l) => ({ content: l.content, reflection: l.reflection })),
    })),
    ...tree.buds.map((b) => ({
      data: {
        id: b.id,
        label: b.label,
        description: b.description,
        type: 'bud' as const,
      },
      leaves: undefined,
    })),
  ];

  // Divide terminals into sectors
  const sectorSize = Math.floor(sorted.length / items.length);
  items.forEach((item, i) => {
    const sectorStart = i * sectorSize;
    const mid = sectorStart + Math.floor(sectorSize / 2);
    const t = sorted[Math.min(mid, sorted.length - 1)];
    const side: 'left' | 'right' = t.x < cx ? 'left' : 'right';

    annotations.push({
      treeX: t.x,
      treeY: t.y,
      labelX: 0,
      labelY: 0,
      side,
      data: item.data,
      leaves: item.leaves,
    });
  });

  // Add roots
  rootAnchors.forEach((r) => {
    annotations.push({
      treeX: r.x,
      treeY: r.y,
      labelX: 0,
      labelY: 0,
      side: r.x < cx ? 'left' : 'right',
      data: r.data,
    });
  });

  // Position labels on left and right sides
  const leftAnns = annotations.filter((a) => a.side === 'left').sort((a, b) => a.treeY - b.treeY);
  const rightAnns = annotations.filter((a) => a.side === 'right').sort((a, b) => a.treeY - b.treeY);
  const margin = 24;
  const minSpacing = 52;

  function layoutSide(anns: Annotation[], labelX: number) {
    // Start from the topmost anchor Y and space down
    if (anns.length === 0) return;
    const startY = Math.max(40, anns[0].treeY - 20);
    anns.forEach((ann, i) => {
      ann.labelX = labelX;
      ann.labelY = startY + i * minSpacing;
    });
  }

  layoutSide(leftAnns, margin);
  layoutSide(rightAnns, w - margin - 160);

  return annotations;
}

/* ================================================================== */
/*  Particle                                                           */
/* ================================================================== */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  size: number;
  color: string;
  opacity: number;
}

function scatter(cx: number, cy: number, w: number, h: number): { x: number; y: number; vx: number; vy: number } {
  return {
    x: cx + (Math.random() - 0.5) * w * 0.9,
    y: cy + (Math.random() - 0.5) * h * 0.7,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.5) * 14,
  };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

const PARTICLE_COUNT = 14000;
const MAX_DEPTH = 9;

export default function LifeTree({ tree, onGrowComplete }: LifeTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const onCompleteRef = useRef(onGrowComplete);
  onCompleteRef.current = onGrowComplete;

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [settled, setSettled] = useState(false);
  const [selected, setSelected] = useState<Annotation | null>(null);
  const [dims, setDims] = useState({ w: 900, h: 700 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth || 900;
    const h = Math.max(container.clientHeight, 700);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    setDims({ w, h });

    // Paper grain texture
    let bgPattern: CanvasPattern | null = null;
    const nc = document.createElement('canvas');
    nc.width = 120;
    nc.height = 120;
    const nctx = nc.getContext('2d');
    if (nctx) {
      nctx.fillStyle = '#FFFFFF';
      nctx.fillRect(0, 0, 120, 120);
      for (let i = 0; i < 1600; i++) {
        nctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.02})`;
        nctx.fillRect(Math.random() * 120, Math.random() * 120, 1, 1);
      }
      bgPattern = ctx.createPattern(nc, 'repeat');
    }

    // ---- Generate the fractal tree shape ----
    const cx = w / 2;
    const baseY = h - 55;
    const startLength = h * 0.18;
    const treeTargets: Array<{ x: number; y: number }> = [];
    const terminals: Terminal[] = [];

    generateRecursiveTree(cx, baseY, -Math.PI / 2, startLength, MAX_DEPTH, treeTargets, terminals);

    // Extra trunk density (thick tapered column from base up to first split)
    const trunkTopY = baseY - startLength;
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const spread = 9 * (1 - t * 0.6);
      for (let j = 0; j < 4; j++) {
        treeTargets.push({
          x: cx + (Math.random() - 0.5) * spread * 2,
          y: baseY - (baseY - trunkTopY) * t + (Math.random() - 0.5) * 2,
        });
      }
    }

    // ---- Coloured clusters at terminal positions ----
    // Assign terminals to LifeTree branches/buds
    const sortedTerminals = [...terminals].sort((a, b) => a.angle - b.angle);
    const allItems = [...tree.branches, ...tree.buds];
    const sectorSize = Math.floor(sortedTerminals.length / allItems.length);

    const leafTargets: Array<{ x: number; y: number }> = [];
    const budTargets: Array<{ x: number; y: number }> = [];

    allItems.forEach((item, idx) => {
      const start = idx * sectorSize;
      const end = Math.min(start + sectorSize, sortedTerminals.length);
      const isBud = idx >= tree.branches.length;

      // Pick ~30% of terminals in this sector for coloured clusters
      for (let i = start; i < end; i++) {
        if (Math.random() < 0.35) {
          const t = sortedTerminals[i];
          const cluster = isBud ? budTargets : leafTargets;
          for (let j = 0; j < 5; j++) {
            cluster.push({
              x: t.x + (Math.random() - 0.5) * 10,
              y: t.y + (Math.random() - 0.5) * 10,
            });
          }
        }
      }
    });

    // ---- Roots ----
    const rootTargets: Array<{ x: number; y: number }> = [];
    const rootAnchors: Array<{ x: number; y: number; data: HierarchyData }> = [];

    tree.roots.forEach((root, ri) => {
      const count = tree.roots.length;
      const rSpread = Math.PI * 0.5;
      const rStep = count > 1 ? rSpread / (count - 1) : 0;
      const rAngle = Math.PI / 2 - rSpread / 2 + ri * rStep;
      const rLen = 35 + Math.random() * 30;
      const endX = cx + Math.cos(rAngle) * rLen;
      const endY = baseY + Math.sin(rAngle) * rLen * 0.5 + 12;

      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        rootTargets.push({
          x: cx + (endX - cx) * t + (Math.random() - 0.5) * 2,
          y: baseY + (endY - baseY) * t + (Math.random() - 0.5),
        });
      }

      rootAnchors.push({
        x: endX,
        y: endY,
        data: {
          id: root.id,
          label: root.label,
          description: root.description,
          type: 'root',
        },
      });
    });

    // ---- Create particles ----
    const particles: Particle[] = [];
    const mid = { x: cx, y: h / 2 };

    // Tree shape particles
    const treeCount = PARTICLE_COUNT - leafTargets.length * 2 - budTargets.length * 2 - rootTargets.length * 3;
    for (let i = 0; i < treeCount; i++) {
      const t = treeTargets[Math.floor(Math.random() * treeTargets.length)];
      const s = scatter(mid.x, mid.y, w, h);
      particles.push({ ...s, tx: t.x, ty: t.y, size: Math.random() * 1.2 + 0.4, color: pick(TREE_COLORS), opacity: Math.random() * 0.55 + 0.2 });
    }

    // Leaf particles
    for (const t of leafTargets) {
      const s = scatter(mid.x, mid.y, w, h);
      particles.push({ ...s, tx: t.x, ty: t.y, size: Math.random() * 1.1 + 0.5, color: pick(LEAF_COLORS), opacity: Math.random() * 0.6 + 0.25 });
    }

    // Bud particles
    for (const t of budTargets) {
      const s = scatter(mid.x, mid.y, w, h);
      particles.push({ ...s, tx: t.x, ty: t.y, size: Math.random() * 1.1 + 0.5, color: pick(BUD_COLORS), opacity: Math.random() * 0.6 + 0.25 });
    }

    // Root particles
    for (const t of rootTargets) {
      const s = scatter(mid.x, mid.y, w, h);
      particles.push({ ...s, tx: t.x, ty: t.y, size: Math.random() * 1.0 + 0.3, color: pick(ROOT_COLORS), opacity: Math.random() * 0.25 + 0.08 });
    }

    // ---- Compute annotation layout ----
    const anns = computeAnnotations(tree, terminals, rootAnchors, cx, w, h);
    setAnnotations(anns);

    // ---- Animation ----
    let frame = 0;
    let settleFrames = 0;
    let didSettle = false;

    function animate() {
      if (!ctx) return;

      ctx.fillStyle = bgPattern || '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      let totalV = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        p.vx += dx * 0.003;
        p.vy += dy * 0.003;
        p.vx *= 0.92;
        p.vy *= 0.92;

        if (dist > 8) {
          p.vx += (Math.random() - 0.5) * 0.55;
          p.vy += (Math.random() - 0.5) * 0.55;
        }

        p.x += p.vx;
        p.y += p.vy;
        totalV += Math.abs(p.vx) + Math.abs(p.vy);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      frame++;
      const avg = totalV / particles.length;
      if (!didSettle && avg < 0.5 && frame > 120) {
        settleFrames++;
        if (settleFrames > 25) {
          didSettle = true;
          setSettled(true);
          onCompleteRef.current?.();
        }
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [tree]);

  /* ---- Annotation line path ---- */
  function linePath(ann: Annotation): string {
    const { treeX, treeY, labelX, labelY } = ann;
    const lx = ann.side === 'left' ? labelX + 160 : labelX;
    const ly = labelY + 8;
    // Horizontal-first bezier
    const midX = treeX + (lx - treeX) * 0.6;
    return `M${treeX},${treeY} C${midX},${treeY} ${lx},${ly} ${lx},${ly}`;
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: '70vh' }}>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ minHeight: '70vh' }}
      />

      {/* ---- Always-visible annotations (fade in after settle) ---- */}
      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* SVG annotation lines */}
            <svg
              className="absolute inset-0"
              style={{ width: dims.w, height: dims.h }}
              viewBox={`0 0 ${dims.w} ${dims.h}`}
            >
              {annotations.map((ann) => (
                <g key={ann.data.id}>
                  {/* Dot on tree */}
                  <circle
                    cx={ann.treeX}
                    cy={ann.treeY}
                    r={3}
                    fill={nodeColor(ann.data.type)}
                    opacity={0.7}
                  />
                  {/* Line to label */}
                  <path
                    d={linePath(ann)}
                    fill="none"
                    stroke={nodeColor(ann.data.type)}
                    strokeWidth={0.6}
                    opacity={0.35}
                  />
                </g>
              ))}
            </svg>

            {/* Labels */}
            {annotations.map((ann) => (
              <div
                key={ann.data.id}
                className="absolute pointer-events-auto cursor-pointer group"
                style={{
                  left: ann.labelX,
                  top: ann.labelY,
                  width: 160,
                  textAlign: ann.side === 'left' ? 'right' : 'left',
                }}
                onClick={() => setSelected(selected?.data.id === ann.data.id ? null : ann)}
              >
                <span
                  className="font-ui transition-colors duration-200 group-hover:text-text-primary"
                  style={{
                    fontSize: '0.7rem',
                    color: selected?.data.id === ann.data.id
                      ? nodeColor(ann.data.type)
                      : 'var(--text-muted)',
                    fontWeight: selected?.data.id === ann.data.id ? 600 : 400,
                  }}
                >
                  {ann.data.label}
                </span>
                {ann.data.period && (
                  <span
                    className="font-ui block"
                    style={{ fontSize: '0.6rem', color: 'var(--text-muted)', opacity: 0.6 }}
                  >
                    {ann.data.period}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Detail panel (click to reveal) ---- */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="absolute z-50 bg-white px-5 py-4"
              style={{
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${nodeColor(selected.data.type)}`,
                width: 280,
                left: selected.side === 'left' ? selected.labelX : selected.labelX - 120,
                top: selected.labelY + 28,
              }}
            >
              <p className="text-sm font-bold text-text-primary mb-1" style={{ lineHeight: 1.3 }}>
                {selected.data.label}
              </p>
              {selected.data.period && (
                <p className="font-ui text-text-muted mb-2" style={{ fontSize: '0.7rem' }}>
                  {selected.data.period}
                </p>
              )}
              <p className="text-sm text-text-secondary leading-[1.5] mb-3">
                {selected.data.description}
              </p>

              {/* Leaves list */}
              {selected.leaves && selected.leaves.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {selected.leaves.map((leaf, i) => (
                    <div key={i} className="mb-3">
                      <p className="text-xs text-text-primary leading-[1.4]">
                        {leaf.content}
                      </p>
                      <p
                        className="text-xs leading-[1.4] mt-0.5"
                        style={{ color: '#3D5A3D', fontStyle: 'italic' }}
                      >
                        {leaf.reflection}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {selected.data.type === 'bud' && (
                <p className="font-ui" style={{ color: '#C17F3A', fontSize: '0.65rem' }}>
                  Possible future
                </p>
              )}
              {selected.data.type === 'root' && (
                <p className="font-ui" style={{ color: '#BBBBBB', fontSize: '0.65rem' }}>
                  Core value
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
