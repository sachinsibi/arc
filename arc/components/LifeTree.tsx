'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeTree as LifeTreeType } from '@/lib/types';
import { HierarchyData } from '@/lib/tree-layout';

interface LifeTreeProps {
  tree: LifeTreeType;
  onGrowComplete?: () => void;
}

function nodeColor(type: string): string {
  if (type === 'leaf') return '#3D5A3D';
  if (type === 'bud') return '#C17F3A';
  if (type === 'root') return '#BBBBBB';
  if (type === 'trunk') return '#2C2C2C';
  return '#555555';
}

/* ================================================================== */
/*  Types                                                              */
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

/* ================================================================== */
/*  Queued drawing system — records commands, plays them back over time */
/* ================================================================== */

type DrawCmd =
  | { type: 'stroke'; pts: Array<[number, number]>; color: string; width: number; alpha: number; cap: CanvasLineCap; bezier?: boolean }
  | { type: 'fill'; cx: number; cy: number; r: number; color: string; alpha: number }
  | { type: 'ring'; cx: number; cy: number; r: number; color: string; alpha: number };

interface DrawStep {
  time: number; // ms from start
  cmds: DrawCmd[];
}

function buildTreeSteps(
  tree: LifeTreeType,
  w: number,
  h: number,
): { steps: DrawStep[]; annotations: Annotation[] } {
  const steps: DrawStep[] = [];
  const annotations: Annotation[] = [];
  let currentCmds: DrawCmd[] = [];

  const cx = w / 2;
  const baseY = h * 0.84;
  const trunkTopY = h * 0.34;

  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function flush(time: number) {
    if (currentCmds.length > 0) {
      steps.push({ time, cmds: [...currentCmds] });
      currentCmds = [];
    }
  }

  // --- Queue organic line ---
  function queueOrganicLine(
    x1: number, y1: number, x2: number, y2: number,
    baseWidth: number, color: string, alpha = 1,
  ) {
    const passes = Math.max(2, Math.ceil(baseWidth * 1.5));
    for (let p = 0; p < passes; p++) {
      const ox = (rand() - 0.5) * baseWidth * 0.6;
      const oy = (rand() - 0.5) * baseWidth * 0.3;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const jx = (rand() - 0.5) * Math.abs(dx) * 0.3;
      const jy = (rand() - 0.5) * Math.abs(dy) * 0.15;

      currentCmds.push({
        type: 'stroke',
        pts: [
          [x1 + ox, y1 + oy],
          [x1 + dx * 0.25 + jx + ox * 0.7, y1 + dy * 0.45 + jy + oy * 0.5],
          [x1 + dx * 0.75 - jx * 0.5 + ox * 0.3, y1 + dy * 0.65 - jy * 0.3 + oy * 0.2],
          [x2 + (rand() - 0.5) * 2, y2 + (rand() - 0.5) * 2],
        ],
        color,
        width: 0.5 + rand() * 1.2,
        alpha: alpha * (0.15 + rand() * 0.25),
        cap: 'round',
        bezier: true,
      });
    }
  }

  // --- Queue sub-canopy ---
  function queueSubCanopy(
    x: number, y: number, angle: number, len: number, depth: number,
    color: string, width: number,
    terminals: Array<{ x: number; y: number }>,
  ) {
    if (depth === 0) { terminals.push({ x, y }); return; }
    const endX = x + Math.cos(angle) * len;
    const endY = y + Math.sin(angle) * len;
    queueOrganicLine(x, y, endX, endY, Math.max(0.5, width), color, 0.8);
    const spread = 0.33 + rand() * 0.16;
    const next = len * (0.58 + rand() * 0.12);
    queueSubCanopy(endX, endY, angle - spread, next, depth - 1, color, width * 0.6, terminals);
    queueSubCanopy(endX, endY, angle + spread, next, depth - 1, color, width * 0.6, terminals);
  }

  // --- Queue leaf cluster ---
  function queueLeaf(x: number, y: number) {
    currentCmds.push({ type: 'fill', cx: x, cy: y, r: 2.5 + rand() * 1.5, color: '#3D5A3D', alpha: 0.7 + rand() * 0.2 });
    for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
      const a = rand() * Math.PI * 2;
      const d = 3 + rand() * 4;
      currentCmds.push({ type: 'fill', cx: x + Math.cos(a) * d, cy: y + Math.sin(a) * d, r: 1 + rand() * 1.5, color: '#3D5A3D', alpha: 0.3 + rand() * 0.3 });
    }
  }

  // --- Queue bud ---
  function queueBud(x: number, y: number) {
    currentCmds.push({ type: 'fill', cx: x, cy: y, r: 3.5, color: '#C17F3A', alpha: 0.75 });
    currentCmds.push({ type: 'ring', cx: x, cy: y, r: 7, color: '#C17F3A', alpha: 0.12 });
  }

  // ==========================================================
  //  BUILD STEPS
  // ==========================================================

  // 1. Trunk (0–800ms, progressive reveal from base to top)
  const baseHalfW = 14;
  const topHalfW = 3;
  const segments = 40;
  const trunkSlices = 8;

  for (let slice = 0; slice < trunkSlices; slice++) {
    const tStart = slice / trunkSlices;
    const tEnd = (slice + 1) / trunkSlices;
    currentCmds = [];

    // Vertical fill strokes for this slice
    for (let s = 0; s < 8; s++) {
      const xOff = (rand() - 0.5) * baseHalfW * 2;
      const pts: Array<[number, number]> = [];
      for (let i = Math.floor(tStart * segments); i <= Math.ceil(tEnd * segments); i++) {
        const t = i / segments;
        const halfW = baseHalfW * (1 - t) + topHalfW * t;
        const wobble = (rand() - 0.5) * 3;
        pts.push([cx + xOff * (1 - t * 0.85) + wobble, baseY - (baseY - trunkTopY) * t]);
      }
      currentCmds.push({ type: 'stroke', pts, color: '#1a1a1a', width: 0.4 + rand() * 0.8, alpha: 0.06 + rand() * 0.12, cap: 'round' });
    }

    // Edge contours for this slice
    for (let side = -1; side <= 1; side += 2) {
      const pts: Array<[number, number]> = [];
      for (let i = Math.floor(tStart * segments); i <= Math.ceil(tEnd * segments); i++) {
        const t = i / segments;
        const halfW = baseHalfW * (1 - t) + topHalfW * t;
        pts.push([cx + side * halfW + (rand() - 0.5) * 2.5, baseY - (baseY - trunkTopY) * t + (rand() - 0.5) * 1.5]);
      }
      currentCmds.push({ type: 'stroke', pts, color: '#222222', width: 0.6 + rand() * 0.5, alpha: 0.2 + rand() * 0.15, cap: 'round' });
    }

    flush(slice * 100);
  }

  // Base flare
  currentCmds = [];
  for (let pass = 0; pass < 4; pass++) {
    const spread = baseHalfW + 8 + rand() * 6;
    currentCmds.push({
      type: 'stroke',
      pts: [[cx - spread, baseY + 2 + rand() * 3], [cx, baseY - 3 + rand() * 2], [cx + spread, baseY + 2 + rand() * 3]],
      color: '#333333', width: 0.4 + rand() * 0.6, alpha: 0.08 + rand() * 0.06, cap: 'round', bezier: true,
    });
  }
  flush(750);

  annotations.push({
    treeX: cx, treeY: (baseY + trunkTopY) / 2,
    labelX: 0, labelY: 0, side: 'left',
    data: { id: tree.trunk.id, label: tree.trunk.label, description: tree.trunk.description, type: 'trunk', thickness: 5 },
  });

  // 2. Branches (900ms+, staggered per branch)
  const allItems = tree.branches.length + tree.buds.length;
  const totalSpread = Math.PI * 0.85;
  const startAngle = -Math.PI / 2 - totalSpread / 2;

  tree.branches.forEach((b, bi) => {
    const angle = startAngle + ((bi + 0.5) / allItems) * totalSpread;
    const stemLen = 70 + b.thickness * 28;
    const endX = cx + Math.cos(angle) * stemLen;
    const endY = trunkTopY + Math.sin(angle) * stemLen;
    const width = 1.5 + b.thickness * 0.9;
    const t0 = 900 + bi * 350;

    // Main stem
    currentCmds = [];
    queueOrganicLine(cx, trunkTopY, endX, endY, width, '#444444');
    flush(t0);

    // Sub-canopy
    currentCmds = [];
    const canopyDepth = Math.min(4, Math.max(2, Math.ceil(b.thickness * 0.6) + 1));
    const canopyLen = 22 + b.thickness * 8;
    const terminals: Array<{ x: number; y: number }> = [];
    queueSubCanopy(endX, endY, angle, canopyLen, canopyDepth, '#777777', width * 0.4, terminals);
    flush(t0 + 400);

    // Children
    b.children.forEach((child, ci) => {
      currentCmds = [];
      const childAngle = angle + (ci - (b.children.length - 1) / 2) * 0.4;
      const childLen = stemLen * 0.5;
      const childEndX = endX + Math.cos(childAngle) * childLen;
      const childEndY = endY + Math.sin(childAngle) * childLen;
      queueOrganicLine(endX, endY, childEndX, childEndY, width * 0.4, '#777777');
      const childTerminals: Array<{ x: number; y: number }> = [];
      queueSubCanopy(childEndX, childEndY, childAngle, 14, 2, '#999999', 0.6, childTerminals);
      flush(t0 + 600);

      currentCmds = [];
      child.leaves.forEach((_, li) => {
        const ct = childTerminals[Math.min(li, childTerminals.length - 1)] || { x: childEndX, y: childEndY };
        queueLeaf(ct.x, ct.y);
      });
      flush(t0 + 900);
    });

    // Leaves
    currentCmds = [];
    b.leaves.forEach((_, li) => {
      const t = terminals[Math.min(li, terminals.length - 1)] || { x: endX, y: endY };
      queueLeaf(t.x, t.y);
    });
    flush(t0 + 800);

    annotations.push({
      treeX: endX, treeY: endY, labelX: 0, labelY: 0,
      side: endX < cx ? 'left' : 'right',
      data: { id: b.id, label: b.label, description: b.description, type: 'branch', thickness: b.thickness, period: b.period },
      leaves: [
        ...b.leaves.map((l) => ({ content: l.content, reflection: l.reflection })),
        ...b.children.flatMap((c) => c.leaves.map((l) => ({ content: l.content, reflection: l.reflection }))),
      ],
    });
  });

  // 3. Buds
  tree.buds.forEach((bud, bi) => {
    const angle = startAngle + ((tree.branches.length + bi + 0.5) / allItems) * totalSpread;
    const stemLen = 48 + rand() * 20;
    const endX = cx + Math.cos(angle) * stemLen;
    const endY = trunkTopY + Math.sin(angle) * stemLen;
    const t0 = 900 + (tree.branches.length + bi) * 350;

    currentCmds = [];
    queueOrganicLine(cx, trunkTopY, endX, endY, 1, '#888888', 0.7);
    const terminals: Array<{ x: number; y: number }> = [];
    queueSubCanopy(endX, endY, angle, 12, 2, '#AAAAAA', 0.5, terminals);
    flush(t0);

    currentCmds = [];
    terminals.forEach((t) => queueBud(t.x, t.y));
    flush(t0 + 500);

    annotations.push({
      treeX: endX, treeY: endY, labelX: 0, labelY: 0,
      side: endX < cx ? 'left' : 'right',
      data: { id: bud.id, label: bud.label, description: bud.description, type: 'bud' },
    });
  });

  // 4. Roots
  tree.roots.forEach((root, ri) => {
    const count = tree.roots.length;
    const rSpread = Math.PI * 0.55;
    const rStep = count > 1 ? rSpread / (count - 1) : 0;
    const rAngle = Math.PI / 2 - rSpread / 2 + ri * rStep;
    const rLen = 35 + rand() * 25;
    const endX = cx + Math.cos(rAngle) * rLen;
    const endY = baseY + Math.sin(rAngle) * rLen * 0.45 + 12;
    const t0 = 900 + allItems * 350 + ri * 200;

    currentCmds = [];
    queueOrganicLine(cx, baseY, endX, endY, 0.7, '#CCCCCC', 0.35);
    for (let i = 0; i < 2; i++) {
      const tAngle = rAngle + (rand() - 0.5) * 0.5;
      const tLen = 6 + rand() * 10;
      queueOrganicLine(endX, endY, endX + Math.cos(tAngle) * tLen, endY + Math.sin(tAngle) * tLen * 0.4, 0.3, '#CCCCCC', 0.2);
    }
    flush(t0);

    annotations.push({
      treeX: endX, treeY: endY, labelX: 0, labelY: 0,
      side: endX < cx ? 'left' : 'right',
      data: { id: root.id, label: root.label, description: root.description, type: 'root' },
    });
  });

  // Layout annotations
  const leftAnns = annotations.filter((a) => a.side === 'left').sort((a, b) => a.treeY - b.treeY);
  const rightAnns = annotations.filter((a) => a.side === 'right').sort((a, b) => a.treeY - b.treeY);
  const margin = 18;
  const minGap = 54;
  function layoutSide(anns: Annotation[], lx: number) {
    if (!anns.length) return;
    const firstY = Math.max(25, anns[0].treeY - 25);
    anns.forEach((ann, i) => { ann.labelX = lx; ann.labelY = firstY + i * minGap; });
  }
  layoutSide(leftAnns, margin);
  layoutSide(rightAnns, w - margin - 175);

  // Sort steps by time
  steps.sort((a, b) => a.time - b.time);
  return { steps, annotations };
}

/* ================================================================== */
/*  Execute draw commands on canvas                                    */
/* ================================================================== */

function executeStep(ctx: CanvasRenderingContext2D, step: DrawStep) {
  for (const cmd of step.cmds) {
    if (cmd.type === 'stroke') {
      ctx.beginPath();
      ctx.globalAlpha = cmd.alpha;
      ctx.strokeStyle = cmd.color;
      ctx.lineWidth = cmd.width;
      ctx.lineCap = cmd.cap;
      ctx.moveTo(cmd.pts[0][0], cmd.pts[0][1]);
      if (cmd.bezier && cmd.pts.length === 4) {
        ctx.bezierCurveTo(cmd.pts[1][0], cmd.pts[1][1], cmd.pts[2][0], cmd.pts[2][1], cmd.pts[3][0], cmd.pts[3][1]);
      } else if (cmd.bezier && cmd.pts.length === 3) {
        ctx.quadraticCurveTo(cmd.pts[1][0], cmd.pts[1][1], cmd.pts[2][0], cmd.pts[2][1]);
      } else {
        for (let i = 1; i < cmd.pts.length; i++) ctx.lineTo(cmd.pts[i][0], cmd.pts[i][1]);
      }
      ctx.stroke();
    } else if (cmd.type === 'fill') {
      ctx.beginPath();
      ctx.globalAlpha = cmd.alpha;
      ctx.fillStyle = cmd.color;
      ctx.arc(cmd.cx, cmd.cy, cmd.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (cmd.type === 'ring') {
      ctx.beginPath();
      ctx.globalAlpha = cmd.alpha;
      ctx.strokeStyle = cmd.color;
      ctx.lineWidth = 1;
      ctx.arc(cmd.cx, cmd.cy, cmd.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function LifeTree({ tree, onGrowComplete }: LifeTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onGrowComplete);
  onCompleteRef.current = onGrowComplete;
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Annotation | null>(null);
  const [dims, setDims] = useState({ w: 900, h: 700 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
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

    // Match page background
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, w, h);

    // Build all drawing steps
    const { steps, annotations: anns } = buildTreeSteps(tree, w, h);
    setAnnotations(anns);
    setReady(false);

    // Play steps back over time
    const startTime = performance.now();
    let stepIdx = 0;
    let animId = 0;

    function tick() {
      if (!ctx) return;
      const elapsed = performance.now() - startTime;
      while (stepIdx < steps.length && steps[stepIdx].time <= elapsed) {
        executeStep(ctx, steps[stepIdx]);
        stepIdx++;
      }
      if (stepIdx < steps.length) {
        animId = requestAnimationFrame(tick);
      } else {
        setReady(true);
        onCompleteRef.current?.();
      }
    }
    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, [tree]);

  function annLinePath(ann: Annotation): string {
    const lx = ann.side === 'left' ? ann.labelX + 175 : ann.labelX;
    const ly = ann.labelY + 8;
    const mx = ann.treeX + (lx - ann.treeX) * 0.6;
    return `M${ann.treeX},${ann.treeY} C${mx},${ann.treeY} ${lx},${ly} ${lx},${ly}`;
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: '70vh' }}>
      <canvas ref={canvasRef} className="w-full" style={{ minHeight: '70vh' }} />

      {/* ---- Annotations ---- */}
      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none"
          >
            <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="absolute inset-0 w-full h-full">
              {annotations.map((ann) => (
                <g key={ann.data.id}>
                  <circle cx={ann.treeX} cy={ann.treeY} r={ann.data.type === 'trunk' ? 3 : 2.5} fill={nodeColor(ann.data.type)} opacity={0.5} />
                  <path d={annLinePath(ann)} fill="none" stroke={nodeColor(ann.data.type)} strokeWidth={0.6} opacity={0.22} />
                </g>
              ))}
            </svg>

            {annotations.map((ann) => {
              const isSelected = selected?.data.id === ann.data.id;
              const color = nodeColor(ann.data.type);
              return (
                <div
                  key={ann.data.id}
                  className="absolute pointer-events-auto cursor-pointer group"
                  style={{ left: ann.labelX, top: ann.labelY, width: 175, textAlign: ann.side === 'left' ? 'right' : 'left' }}
                  onClick={() => setSelected(isSelected ? null : ann)}
                >
                  <span
                    className="transition-all duration-200 group-hover:opacity-100"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '0.72rem',
                      lineHeight: 1.3,
                      color: isSelected ? color : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 400,
                      opacity: isSelected ? 1 : 0.7,
                    }}
                  >
                    {ann.data.label}
                  </span>
                  {ann.data.period && (
                    <span className="font-ui block" style={{ fontSize: '0.58rem', color: 'var(--text-muted)', opacity: 0.55, marginTop: 1 }}>
                      {ann.data.period}
                    </span>
                  )}
                  {ann.data.type === 'bud' && (
                    <span className="font-ui block" style={{ fontSize: '0.52rem', color: '#C17F3A', opacity: 0.65, marginTop: 1 }}>
                      possible future
                    </span>
                  )}
                  {ann.data.type === 'root' && (
                    <span className="font-ui block" style={{ fontSize: '0.52rem', color: '#BBBBBB', opacity: 0.75, marginTop: 1 }}>
                      core value
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Detail panel ---- */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setSelected(null)} />
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="absolute z-50 bg-white px-5 py-4"
              style={{
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${nodeColor(selected.data.type)}`,
                width: 300,
                left: selected.side === 'left' ? selected.labelX : Math.max(8, selected.labelX - 130),
                top: selected.labelY + 32,
              }}
            >
              <p className="font-bold text-text-primary mb-1" style={{ fontSize: '0.85rem', lineHeight: 1.3 }}>{selected.data.label}</p>
              {selected.data.period && <p className="font-ui text-text-muted mb-2" style={{ fontSize: '0.7rem' }}>{selected.data.period}</p>}
              <p className="text-text-secondary leading-[1.55] mb-3" style={{ fontSize: '0.8rem' }}>{selected.data.description}</p>
              {selected.leaves && selected.leaves.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <p className="font-ui mb-2" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moments</p>
                  {selected.leaves.map((leaf, i) => (
                    <div key={i} className="mb-3">
                      <p className="text-text-primary leading-[1.4]" style={{ fontSize: '0.75rem' }}>{leaf.content}</p>
                      <p className="leading-[1.4] mt-0.5" style={{ fontSize: '0.72rem', color: '#3D5A3D', fontStyle: 'italic' }}>{leaf.reflection}</p>
                    </div>
                  ))}
                </div>
              )}
              {selected.data.type === 'bud' && <p className="font-ui" style={{ color: '#C17F3A', fontSize: '0.65rem' }}>Possible future</p>}
              {selected.data.type === 'root' && <p className="font-ui" style={{ color: '#BBBBBB', fontSize: '0.65rem' }}>Core value</p>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
