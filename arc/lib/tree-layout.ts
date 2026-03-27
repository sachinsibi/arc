import * as d3 from 'd3';
import { LifeTree, Branch } from './types';

export interface HierarchyData {
  id: string;
  label: string;
  description: string;
  type: 'trunk' | 'branch' | 'leaf' | 'bud' | 'root';
  thickness?: number;
  period?: string;
  reflection?: string;
  content?: string;
  children?: HierarchyData[];
}

/* ------------------------------------------------------------------ */
/*  Convert LifeTree data into a d3-compatible hierarchy               */
/* ------------------------------------------------------------------ */

function branchToHierarchy(branch: Branch): HierarchyData {
  const children: HierarchyData[] = [];

  // Add sub-branches
  for (const child of branch.children) {
    children.push(branchToHierarchy(child));
  }

  // Add leaves as terminal nodes
  for (const leaf of branch.leaves) {
    children.push({
      id: leaf.id,
      label: leaf.content,
      description: leaf.content,
      type: 'leaf',
      reflection: leaf.reflection,
      content: leaf.content,
    });
  }

  return {
    id: branch.id,
    label: branch.label,
    description: branch.description,
    type: 'branch',
    thickness: branch.thickness,
    period: branch.period,
    children: children.length > 0 ? children : undefined,
  };
}

export function treeToHierarchy(tree: LifeTree): HierarchyData {
  const children: HierarchyData[] = [];

  // Add branches
  for (const branch of tree.branches) {
    children.push(branchToHierarchy(branch));
  }

  // Add buds as special terminal nodes
  for (const bud of tree.buds) {
    children.push({
      id: bud.id,
      label: bud.label,
      description: bud.description,
      type: 'bud',
    });
  }

  return {
    id: tree.trunk.id,
    label: tree.trunk.label,
    description: tree.trunk.description,
    type: 'trunk',
    thickness: 5,
    children,
  };
}

export function rootsToData(tree: LifeTree): HierarchyData[] {
  return tree.roots.map((root) => ({
    id: root.id,
    label: root.label,
    description: root.description,
    type: 'root' as const,
  }));
}

/* ------------------------------------------------------------------ */
/*  Vertical bottom-up tree layout                                     */
/* ------------------------------------------------------------------ */

/**
 * Compute a VERTICAL tree layout. D3's tree() produces a top-down layout
 * where y increases downward. We flip y so the tree grows upward:
 *   - The trunk root is at the bottom
 *   - Branches grow upward and outward
 *
 * Returns the d3 hierarchy with x/y already assigned.
 */
export function computeVerticalLayout(
  hierarchyData: HierarchyData,
  width: number,
  height: number,
): d3.HierarchyPointNode<HierarchyData> {
  const hierarchy = d3
    .hierarchy(hierarchyData)
    .sort((a, b) => (b.data.thickness ?? 1) - (a.data.thickness ?? 1));

  const treeLayout = d3
    .tree<HierarchyData>()
    .size([width * 0.7, height * 0.6])
    .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.8));

  const root = treeLayout(hierarchy);

  // Flip Y so the tree grows upward.
  // D3 assigns y=0 at root (top) and y=maxDepth at leaves (bottom).
  // We want root at the bottom and leaves at the top.
  const maxY = d3.max(root.descendants(), (d) => d.y) ?? height * 0.6;

  root.each((node) => {
    // Centre x around 0 (shift so root.x = 0)
    node.x = node.x - root.x;
    // Flip y: root at bottom (y=0 in our coordinate), branches go up (negative y)
    node.y = -(node.y - maxY) - height * 0.05;
  });

  // Now root.y is at the bottom, leaves have smaller (more negative) y values
  // Actually let's make root.y the largest value and leaves have smaller y
  // In SVG, larger y = lower on screen. So root should have the largest y.
  // After the flip above: root.y = -(0 - maxY) - h*0.05 = maxY - h*0.05
  // and leaf at depth d: y = -(d - maxY) - h*0.05 = maxY - d - h*0.05
  // So root has the largest y. Good — root is at the bottom of the SVG.

  return root;
}

/* ------------------------------------------------------------------ */
/*  Jitter — add organic randomness to node positions                  */
/* ------------------------------------------------------------------ */

/**
 * Seeded pseudo-random based on a string (node id).
 * Returns a number between -1 and 1.
 */
export function seededRandom(seed: string, index: number = 0): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  h = ((h + index * 2654435761) | 0) >>> 0;
  return ((h % 2000) - 1000) / 1000;
}

export function addJitter(
  nodes: d3.HierarchyPointNode<HierarchyData>[],
  xAmount: number = 12,
  yAmount: number = 8,
): void {
  nodes.forEach((node) => {
    if (node.data.type === 'trunk') return; // Don't jitter the trunk root
    const jx = seededRandom(node.data.id, 0) * xAmount;
    const jy = seededRandom(node.data.id, 1) * yAmount;
    node.x = node.x + jx;
    node.y = node.y + jy;
  });
}

/* ------------------------------------------------------------------ */
/*  Organic cubic bezier path for branches                             */
/* ------------------------------------------------------------------ */

/**
 * Generate a cubic bezier SVG path between a source and target node.
 * Uses the node id for seeded randomness so the curves are deterministic
 * but look hand-drawn.
 *
 * The path goes from (sx,sy) to (tx,ty) with the control points
 * creating a natural upward-and-outward curve.
 */
export function organicBranchPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  targetId: string,
): string {
  const dx = tx - sx;
  const dy = ty - sy;

  // Base control points: vertical emphasis first, then horizontal
  // First control point: mostly vertical from source
  const r1 = seededRandom(targetId, 2) * 0.15;
  const r2 = seededRandom(targetId, 3) * 0.15;

  const cp1x = sx + dx * (0.15 + r1);
  const cp1y = sy + dy * (0.5 + r2 * 0.3);

  const cp2x = tx - dx * (0.1 + r1 * 0.5);
  const cp2y = sy + dy * (0.7 + r2 * 0.2);

  return `M${sx},${sy} C${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty}`;
}

/* ------------------------------------------------------------------ */
/*  Colour and width helpers                                           */
/* ------------------------------------------------------------------ */

export function getStrokeColour(node: d3.HierarchyPointNode<HierarchyData>): string {
  const { type, thickness } = node.data;
  if (type === 'trunk') return '#2C2C2C';
  if (type === 'bud') return '#C17F3A';
  if (type === 'leaf') return '#888888';
  if (type === 'branch' && (thickness ?? 3) <= 2) return '#888888';
  return '#555555';
}

export function getStrokeWidth(node: d3.HierarchyPointNode<HierarchyData>): number {
  const thickness = node.data.thickness ?? 1;
  // Scale from 2px to 8px
  return 2 + ((thickness - 1) / 4) * 6;
}

/**
 * Tapered stroke width: thicker at source, thinner at target.
 * Returns [sourceWidth, targetWidth].
 */
export function getTaperedWidths(
  source: d3.HierarchyPointNode<HierarchyData>,
  target: d3.HierarchyPointNode<HierarchyData>,
): [number, number] {
  const sourceW = getStrokeWidth(source);
  const targetW = getStrokeWidth(target);
  return [sourceW, targetW];
}
