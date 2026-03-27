'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { LifeTree as LifeTreeType } from '@/lib/types';
import {
  HierarchyData,
  treeToHierarchy,
  rootsToData,
  computeVerticalLayout,
  addJitter,
  organicBranchPath,
  getStrokeColour,
  getStrokeWidth,
  seededRandom,
} from '@/lib/tree-layout';
import TreeNode from './TreeNode';

interface LifeTreeProps {
  tree: LifeTreeType;
  onGrowComplete?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SVG_WIDTH = 900;
const SVG_HEIGHT = 900;
const TRUNK_BASE_Y = SVG_HEIGHT * 0.88; // Where the trunk starts at the very bottom
const TRUNK_WIDTH = 10;

/* Timing (ms) */
const TRUNK_DELAY = 100;
const TRUNK_DURATION = 800;
const BRANCH_START = 900;
const BRANCH_STAGGER = 120;
const BRANCH_DURATION = 700;
const SUBBRANCH_EXTRA_DELAY = 600;
const LEAF_START = 3200;
const LEAF_STAGGER = 60;
const LEAF_DURATION = 500;
const ROOT_START = 4200;
const ROOT_DURATION = 600;
const ROOT_STAGGER = 100;

export default function LifeTree({ tree, onGrowComplete }: LifeTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<HierarchyData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hasRendered = useRef(false);

  const handleNodeClick = useCallback(
    (event: MouseEvent, data: HierarchyData) => {
      event.stopPropagation();
      setTooltipPos({ x: event.clientX, y: event.clientY });
      setSelectedNode(data);
    },
    [],
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || hasRendered.current) return;
    hasRendered.current = true;

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`)
      .attr('width', '100%')
      .attr('height', '100%');

    svg.selectAll('*').remove();

    // Centre the tree in the SVG
    const cx = SVG_WIDTH / 2;
    const g = svg.append('g').attr('transform', `translate(${cx}, 0)`);

    // ---- Zoom / Pan ----
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        g.attr('transform', `translate(${cx}, 0) ${event.transform}`);
      });
    svg.call(zoom);

    // Click on SVG background to dismiss tooltip
    svg.on('click', () => setSelectedNode(null));

    // ---- Compute layout ----
    const hierarchyData = treeToHierarchy(tree);
    const root = computeVerticalLayout(hierarchyData, SVG_WIDTH, SVG_HEIGHT);

    // Add organic jitter
    addJitter(root.descendants(), 14, 10);

    // The trunk root node position
    const trunkX = root.x ?? 0;
    const trunkY = root.y ?? 0;

    // ---- Layer groups (draw order) ----
    const rootsG = g.append('g').attr('class', 'roots');
    const trunkG = g.append('g').attr('class', 'trunk');
    const branchesG = g.append('g').attr('class', 'branches');
    const nodesG = g.append('g').attr('class', 'nodes');

    // ==================================================================
    //  1. TRUNK — tapered filled shape that grows upward from the base
    // ==================================================================
    {
      const trunkBaseBotY = TRUNK_BASE_Y;
      const baseHalfW = TRUNK_WIDTH;
      const topHalfW = TRUNK_WIDTH * 0.45;

      // Slight organic wobble for hand-drawn feel
      const wobble1 = seededRandom(tree.trunk.id, 10) * 4;
      const wobble2 = seededRandom(tree.trunk.id, 11) * 3;
      const midY = (trunkBaseBotY + trunkY) / 2;

      // Centre-line stroke with dasharray for growth animation
      const trunkLine = trunkG
        .append('path')
        .attr(
          'd',
          `M${trunkX},${trunkBaseBotY} C${trunkX + wobble1 * 0.5},${midY} ${trunkX + wobble2 * 0.3},${trunkY + 40} ${trunkX},${trunkY}`,
        )
        .attr('fill', 'none')
        .attr('stroke', '#2C2C2C')
        .attr('stroke-width', TRUNK_WIDTH * 1.8)
        .attr('stroke-linecap', 'round');

      const trunkLen = (trunkLine.node() as SVGPathElement).getTotalLength();
      trunkLine
        .attr('stroke-dasharray', trunkLen)
        .attr('stroke-dashoffset', trunkLen)
        .transition()
        .delay(TRUNK_DELAY)
        .duration(TRUNK_DURATION)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Tapered filled shape fades in after the stroke draws,
      // giving the trunk organic width variation
      const trunkFill = trunkG
        .append('path')
        .attr(
          'd',
          [
            `M${trunkX - baseHalfW},${trunkBaseBotY}`,
            `C${trunkX - baseHalfW + wobble1},${midY}`,
            `${trunkX - topHalfW + wobble2},${trunkY + 30}`,
            `${trunkX},${trunkY}`,
            `C${trunkX + topHalfW - wobble2},${trunkY + 30}`,
            `${trunkX + baseHalfW - wobble1},${midY}`,
            `${trunkX + baseHalfW},${trunkBaseBotY}`,
            'Z',
          ].join(' '),
        )
        .attr('fill', '#2C2C2C')
        .attr('opacity', 0);

      trunkFill
        .transition()
        .delay(TRUNK_DELAY + TRUNK_DURATION * 0.5)
        .duration(TRUNK_DURATION * 0.6)
        .ease(d3.easeCubicOut)
        .attr('opacity', 1);

      // Once the fill is visible, hide the stroke line underneath
      trunkLine
        .transition()
        .delay(TRUNK_DELAY + TRUNK_DURATION)
        .duration(300)
        .attr('opacity', 0);
    }

    // ==================================================================
    //  2. BRANCHES — cubic bezier curves growing outward from trunk
    // ==================================================================
    const links = root.links();

    // Sort links by depth so main branches draw before sub-branches
    links.sort((a, b) => {
      const da = a.target.depth;
      const db = b.target.depth;
      return da - db;
    });

    // Track timing per depth for stagger
    const depthCount: Record<number, number> = {};

    links.forEach((link) => {
      const sourceNode = link.source;
      const targetNode = link.target;

      const sx = sourceNode.x ?? 0;
      const sy = sourceNode.y ?? 0;
      const tx = targetNode.x ?? 0;
      const ty = targetNode.y ?? 0;

      const depth = targetNode.depth;
      if (!(depth in depthCount)) depthCount[depth] = 0;
      const idx = depthCount[depth]++;

      // Generate organic cubic bezier path
      const pathD = organicBranchPath(sx, sy, tx, ty, targetNode.data.id);

      // Determine colour and width
      const colour = getStrokeColour(targetNode);
      const width = getStrokeWidth(targetNode);

      // Tapered width: we approximate taper by setting stroke-width to the
      // average of source and target, since true SVG taper requires a
      // <path> fill polygon. For visual effect this is good enough.
      const sourceWidth = getStrokeWidth(sourceNode);
      const avgWidth = (sourceWidth + width) / 2;
      const displayWidth = Math.max(avgWidth, 1.5);

      const path = branchesG
        .append('path')
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', colour)
        .attr('stroke-width', displayWidth)
        .attr('stroke-linecap', 'round');

      // Growth animation
      const totalLength = (path.node() as SVGPathElement).getTotalLength();
      const delay =
        depth <= 1
          ? BRANCH_START + idx * BRANCH_STAGGER
          : BRANCH_START + SUBBRANCH_EXTRA_DELAY + idx * BRANCH_STAGGER;

      path
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .delay(delay)
        .duration(BRANCH_DURATION)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    });

    // ==================================================================
    //  3. NODES — circles at branch tips (leaves, buds, branch points)
    // ==================================================================
    const allNodes = root.descendants();

    allNodes.forEach((node, i) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const { type } = node.data;
      const depth = node.depth;

      let r: number;
      let fill: string;

      switch (type) {
        case 'trunk':
          r = 0; // Trunk is drawn as the thick line, no circle needed
          fill = '#2C2C2C';
          break;
        case 'leaf':
          r = 5;
          fill = '#3D5A3D';
          break;
        case 'bud':
          r = 6;
          fill = '#C17F3A';
          break;
        case 'branch':
          r = 3;
          fill = '#555555';
          break;
        default:
          r = 3;
          fill = '#555555';
      }

      if (r === 0) return; // Skip trunk centre point

      // Timing: leaves and buds appear after branches are drawn
      const isTerminal = type === 'leaf' || type === 'bud';
      const delay = isTerminal
        ? LEAF_START + i * LEAF_STAGGER
        : BRANCH_START + depth * BRANCH_STAGGER * 2 + 400;

      const circle = nodesG
        .append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 0)
        .attr('fill', fill)
        .attr('opacity', type === 'branch' ? 0.7 : 1)
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent) => handleNodeClick(event, node.data));

      circle
        .transition()
        .delay(delay)
        .duration(LEAF_DURATION)
        .ease(d3.easeBackOut.overshoot(1.5))
        .attr('r', r);

      // Add a very subtle glow/pulse to buds
      if (type === 'bud') {
        const glowCircle = nodesG
          .append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 0)
          .attr('fill', 'none')
          .attr('stroke', '#C17F3A')
          .attr('stroke-width', 1)
          .attr('opacity', 0);

        glowCircle
          .transition()
          .delay(delay + LEAF_DURATION)
          .duration(400)
          .attr('r', r + 3)
          .attr('opacity', 0.3)
          .transition()
          .duration(1500)
          .ease(d3.easeSinInOut)
          .attr('r', r + 6)
          .attr('opacity', 0)
          .on('end', function repeatPulse() {
            d3.select(this)
              .attr('r', r + 2)
              .attr('opacity', 0.25)
              .transition()
              .duration(2000)
              .ease(d3.easeSinInOut)
              .attr('r', r + 8)
              .attr('opacity', 0)
              .on('end', repeatPulse);
          });
      }

      // Small label for branch nodes (not leaves/buds to avoid clutter)
      if (type === 'branch' && node.data.label) {
        const labelText = nodesG
          .append('text')
          .attr('x', x)
          .attr('y', y - r - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', '#6B6B6B')
          .attr('font-size', '9px')
          .attr('font-family', 'Georgia, serif')
          .attr('opacity', 0)
          .text(
            node.data.label.length > 24
              ? node.data.label.slice(0, 22) + '\u2026'
              : node.data.label,
          )
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => handleNodeClick(event, node.data));

        labelText
          .transition()
          .delay(delay + 200)
          .duration(500)
          .attr('opacity', 0.7);
      }
    });

    // ==================================================================
    //  4. ROOTS — ethereal lines below the trunk base
    // ==================================================================
    const rootsData = rootsToData(tree);

    rootsData.forEach((rootData, i) => {
      const count = rootsData.length;
      // Spread roots in a fan below the trunk
      const spreadAngle = Math.PI * 0.6; // Total spread
      const angleStep = count > 1 ? spreadAngle / (count - 1) : 0;
      const baseAngle = Math.PI / 2 - spreadAngle / 2; // Start angle (pointing down-left)
      const angle = baseAngle + i * angleStep;

      const length = 60 + Math.abs(seededRandom(rootData.id, 0)) * 50;
      const endX = trunkX + length * Math.cos(angle);
      const endY = TRUNK_BASE_Y + length * Math.sin(angle) * 0.7 + 15;

      // Organic control points
      const jx = seededRandom(rootData.id, 1) * 20;
      const jy = seededRandom(rootData.id, 2) * 10;
      const cp1x = trunkX + (endX - trunkX) * 0.3 + jx;
      const cp1y = TRUNK_BASE_Y + (endY - TRUNK_BASE_Y) * 0.5 + jy;
      const cp2x = trunkX + (endX - trunkX) * 0.7 - jx * 0.5;
      const cp2y = TRUNK_BASE_Y + (endY - TRUNK_BASE_Y) * 0.8;

      const path = rootsG
        .append('path')
        .attr(
          'd',
          `M${trunkX},${TRUNK_BASE_Y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`,
        )
        .attr('fill', 'none')
        .attr('stroke', '#BBBBBB')
        .attr('stroke-width', 1.5)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.5);

      const totalLength = (path.node() as SVGPathElement).getTotalLength();
      path
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .delay(ROOT_START + i * ROOT_STAGGER)
        .duration(ROOT_DURATION)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Small root tip circle
      const rootCircle = rootsG
        .append('circle')
        .attr('cx', endX)
        .attr('cy', endY)
        .attr('r', 0)
        .attr('fill', '#BBBBBB')
        .attr('opacity', 0.4)
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent) =>
          handleNodeClick(event, rootData),
        );

      rootCircle
        .transition()
        .delay(ROOT_START + i * ROOT_STAGGER + ROOT_DURATION * 0.6)
        .duration(300)
        .attr('r', 3);

      // Root label
      const rootLabel = rootsG
        .append('text')
        .attr('x', endX)
        .attr('y', endY + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#BBBBBB')
        .attr('font-size', '8px')
        .attr('font-family', 'Georgia, serif')
        .attr('font-style', 'italic')
        .attr('opacity', 0)
        .text(rootData.label)
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent) =>
          handleNodeClick(event, rootData),
        );

      rootLabel
        .transition()
        .delay(ROOT_START + i * ROOT_STAGGER + ROOT_DURATION)
        .duration(400)
        .attr('opacity', 0.5);
    });

    // ==================================================================
    //  Signal growth complete
    // ==================================================================
    const totalAnimTime =
      ROOT_START + rootsData.length * ROOT_STAGGER + ROOT_DURATION + 500;
    setTimeout(() => {
      onGrowComplete?.();
    }, totalAnimTime);
  }, [tree, onGrowComplete, handleNodeClick]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ minHeight: '70vh' }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '70vh' }}
      />
      <TreeNode
        node={selectedNode}
        position={tooltipPos}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
