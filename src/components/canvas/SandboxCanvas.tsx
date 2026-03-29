import { useRef, useEffect, useState, useCallback, DragEvent } from 'react';
import * as d3 from 'd3';
import { COLORS, FONTS } from '../../styles/theme';
import { useSandbox } from '../../context/SandboxContext';
import { usePlayback } from '../../context/PlaybackContext';
import { Graph, GraphEdge } from '../../types/graph';
import { Cut } from '../../types/sandbox';
import { validateFlow } from '../../engine/flowValidation';
import { computeCutPartition } from '../../engine/cutAnalysis';

const NODE_RADIUS = 22;
const SNAP_RADIUS = 30;

interface EdgeDraft {
  sourceNodeId: string;
  sourceGraphId: string;
  cursorX: number;
  cursorY: number;
}

interface CutDraft {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface SelectionBox {
  graphId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ContextMenuState {
  graphId: string;
  nodeId: string;
  screenX: number;
  screenY: number;
}

export default function SandboxCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft | null>(null);
  const [cutDraft, setCutDraft] = useState<CutDraft | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<{ graphId: string; nodeId: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [editingLabel, setEditingLabel] = useState<{ graphId: string; nodeId: string } | null>(null);
  const [editingEdge, setEditingEdge] = useState<{ graphId: string; edgeId: string; field: 'capacity' | 'flow' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const isDraggingNode = useRef(false);

  const {
    state, setActiveGraph,
    addNode, removeNode, addEdge, removeEdge,
    updateNodePosition, updateNodeLabel,
    updateEdgeCapacity, updateEdgeFlow,
    setSource, setSink, addGraph, addCut, removeCut,
  } = useSandbox();

  const { currentStep, isGenerated } = usePlayback();

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // D3 zoom -- pan only with shift, scroll zoom always works
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .filter((e: any) => {
        if (e.type === 'wheel') return true;
        if (e.type === 'mousedown' && e.shiftKey) return true;
        return false;
      })
      .on('zoom', e => {
        d3.select(g).attr('transform', e.transform);
      });

    d3.select(svg).call(zoom);

    return () => { d3.select(svg).on('.zoom', null); };
  }, []);

  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const transform = d3.zoomTransform(svg);
    const [x, y] = transform.invert([sx, sy]);
    return { x, y };
  }, []);

  // Find nearest node within snap radius
  const findNearestNode = useCallback((svgX: number, svgY: number, graphId: string, excludeNodeId?: string) => {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return null;
    let best: { nodeId: string; dist: number } | null = null;
    for (const node of graph.nodes) {
      if (node.id === excludeNodeId) continue;
      const dx = (node.x ?? 0) - svgX;
      const dy = (node.y ?? 0) - svgY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < SNAP_RADIUS && (!best || dist < best.dist)) {
        best = { nodeId: node.id, dist };
      }
    }
    return best;
  }, [state.graphs]);

  // Find which node the cursor is near (any graph)
  const findHoveredNode = useCallback((svgX: number, svgY: number) => {
    for (const graph of state.graphs) {
      for (const node of graph.nodes) {
        const dx = (node.x ?? 0) - svgX;
        const dy = (node.y ?? 0) - svgY;
        if (Math.sqrt(dx * dx + dy * dy) < SNAP_RADIUS) {
          return { graphId: graph.id, nodeId: node.id };
        }
      }
    }
    return null;
  }, [state.graphs]);

  // Drop handler for palette
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const role = e.dataTransfer.getData('application/node-role');
    if (!role) return;

    const { x, y } = screenToSvg(e.clientX, e.clientY);
    let graphId = state.activeGraphId;

    if (!graphId) {
      graphId = addGraph({ name: 'New Graph' });
    }

    const graph = state.graphs.find(g => g.id === graphId);
    const existingLabels = new Set(graph?.nodes.map(n => n.label) ?? []);
    let label = '';
    if (role === 'source') {
      label = 'S';
      if (existingLabels.has('S')) {
        for (let i = 1; ; i++) {
          if (!existingLabels.has(`S${i}`)) { label = `S${i}`; break; }
        }
      }
    } else if (role === 'sink') {
      label = 'T';
      if (existingLabels.has('T')) {
        for (let i = 1; ; i++) {
          if (!existingLabels.has(`T${i}`)) { label = `T${i}`; break; }
        }
      }
    } else {
      for (let i = 0; ; i++) {
        const c = String.fromCharCode(65 + i);
        if (!existingLabels.has(c) && c !== 'S' && c !== 'T') { label = c; break; }
      }
    }

    addNode(graphId, label, x, y);

    if (role === 'source') {
      const nodeId = label.toLowerCase().replace(/\s+/g, '-');
      setTimeout(() => setSource(graphId!, nodeId), 0);
    } else if (role === 'sink') {
      const nodeId = label.toLowerCase().replace(/\s+/g, '-');
      setTimeout(() => setSink(graphId!, nodeId), 0);
    }
  }, [state.activeGraphId, state.graphs, addGraph, addNode, setSource, setSink, screenToSvg]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Get edge path for bidirectional support
  const getEdgePath = (edge: GraphEdge, graph: Graph) => {
    const sNode = graph.nodes.find(n => n.id === edge.source);
    const tNode = graph.nodes.find(n => n.id === edge.target);
    if (!sNode || !tNode) return null;

    const sx = sNode.x ?? 0;
    const sy = sNode.y ?? 0;
    const tx = tNode.x ?? 0;
    const ty = tNode.y ?? 0;

    const hasReverse = graph.edges.some(
      e => e.source === edge.target && e.target === edge.source
    );

    if (!hasReverse) {
      return { type: 'line' as const, sx, sy, tx, ty };
    }

    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const direction = edge.source < edge.target ? 1 : -1;
    const offset = 20 * direction;

    return {
      type: 'curve' as const,
      sx, sy, tx, ty,
      cx: mx + nx * offset,
      cy: my + ny * offset,
    };
  };

  const getEdgeLabelPos = (edge: GraphEdge, graph: Graph) => {
    const path = getEdgePath(edge, graph);
    if (!path) return { x: 0, y: 0 };
    if (path.type === 'line') {
      return { x: (path.sx + path.tx) / 2, y: (path.sy + path.ty) / 2 };
    }
    return {
      x: (path.sx + 2 * path.cx + path.tx) / 4,
      y: (path.sy + 2 * path.cy + path.ty) / 4,
    };
  };

  // Node color logic
  const getNodeFill = (nodeId: string, graph: Graph) => {
    if (isGenerated && currentStep) {
      if (currentStep.highlights.activeNodes?.includes(nodeId)) return COLORS.blue;
      if (currentStep.highlights.visitedNodes?.includes(nodeId)) return COLORS.purple;
      if (currentStep.highlights.frontierNodes?.includes(nodeId)) return COLORS.blueDim;
    }
    if (nodeId === graph.sourceId) return COLORS.nodeSource;
    if (nodeId === graph.sinkId) return COLORS.nodeSink;
    return COLORS.nodeDefault;
  };

  const getNodeStroke = (nodeId: string, graph: Graph) => {
    if (state.viewLens === 'validation') {
      const val = validateFlow(graph);
      const nv = val.nodeResults.find(r => r.nodeId === nodeId);
      if (nv && !nv.isConserved) return COLORS.validationError;
    }
    if (nodeId === graph.sourceId) return COLORS.nodeSource;
    if (nodeId === graph.sinkId) return COLORS.nodeSink;
    return COLORS.nodeStroke;
  };

  const getEdgeColor = (edge: GraphEdge, graph: Graph) => {
    if (state.viewLens === 'validation') {
      const val = validateFlow(graph);
      const ev = val.edgeResults.find(r => r.edgeId === edge.id);
      if (ev && (ev.exceedsCapacity || ev.negativeFlow)) return COLORS.validationError;
    }
    if (isGenerated && currentStep) {
      if (currentStep.highlights.activeEdge === edge.id) return COLORS.edgeUpdating;
      if (currentStep.highlights.pathEdges?.includes(edge.id)) return COLORS.edgePath;
      const es = currentStep.edgeStates?.[edge.id];
      if (es) {
        if (es.flow >= es.capacity && es.capacity > 0) return COLORS.edgeFull;
        if (es.flow > 0) return COLORS.edgeFlow;
      }
    }
    if (edge.flow > 0 && edge.flow >= edge.capacity && edge.capacity > 0) return COLORS.edgeFull;
    if (edge.flow > 0) return COLORS.edgeFlow;
    return COLORS.edgeDefault;
  };

  const getEdgeFlow = (edge: GraphEdge) => {
    if (isGenerated && currentStep?.edgeStates?.[edge.id]) {
      return currentStep.edgeStates[edge.id].flow;
    }
    return edge.flow;
  };

  // ── Mouse handlers ──

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Close context menu on any click
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    // Shift+click is for panning (handled by D3 zoom filter)
    if (e.shiftKey) return;

    if (state.canvasMode === 'cut') {
      const { x, y } = screenToSvg(e.clientX, e.clientY);
      setCutDraft({ startX: x, startY: y, endX: x, endY: y });
      return;
    }

    if (state.canvasMode === 'select') {
      // Click on empty canvas starts selection box
      const { x, y } = screenToSvg(e.clientX, e.clientY);
      const graphId = state.activeGraphId;
      if (graphId) {
        setSelectionBox({ graphId, startX: x, startY: y, endX: x, endY: y });
      }
    }
  }, [state.canvasMode, state.activeGraphId, screenToSvg, contextMenu]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToSvg(e.clientX, e.clientY);

    // Track hovered node for highlighting
    const hovered = findHoveredNode(x, y);
    setHoveredNode(hovered);

    if (edgeDraft) {
      // Snap to target node if near one
      const target = findNearestNode(x, y, edgeDraft.sourceGraphId, edgeDraft.sourceNodeId);
      if (target) {
        const graph = state.graphs.find(g => g.id === edgeDraft.sourceGraphId);
        const tNode = graph?.nodes.find(n => n.id === target.nodeId);
        if (tNode) {
          setEdgeDraft(prev => prev ? { ...prev, cursorX: tNode.x ?? 0, cursorY: tNode.y ?? 0 } : null);
          return;
        }
      }
      setEdgeDraft(prev => prev ? { ...prev, cursorX: x, cursorY: y } : null);
    }
    if (cutDraft) {
      setCutDraft(prev => prev ? { ...prev, endX: x, endY: y } : null);
    }
    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
    }
  }, [edgeDraft, cutDraft, selectionBox, screenToSvg, findHoveredNode, findNearestNode, state.graphs]);

  const handleCanvasMouseUp = useCallback(() => {
    // Edge draft: check for snap target
    if (edgeDraft) {
      const graph = state.graphs.find(g => g.id === edgeDraft.sourceGraphId);
      if (graph) {
        const target = findNearestNode(edgeDraft.cursorX, edgeDraft.cursorY, edgeDraft.sourceGraphId, edgeDraft.sourceNodeId);
        if (target) {
          addEdge(edgeDraft.sourceGraphId, edgeDraft.sourceNodeId, target.nodeId, 0);
        }
      }
      setEdgeDraft(null);
    }

    // Cut draft
    if (cutDraft && state.activeGraphId) {
      const graph = state.graphs.find(g => g.id === state.activeGraphId);
      if (graph) {
        const result = computeCutPartition(
          graph,
          { x: cutDraft.startX, y: cutDraft.startY },
          { x: cutDraft.endX, y: cutDraft.endY }
        );
        if (result) {
          addCut({
            id: crypto.randomUUID(),
            graphId: state.activeGraphId,
            lineStart: { x: cutDraft.startX, y: cutDraft.startY },
            lineEnd: { x: cutDraft.endX, y: cutDraft.endY },
            setA: result.setA,
            setB: result.setB,
            cutCapacity: result.cutCapacity,
            crossingEdges: result.crossingEdges,
          });
        }
      }
      setCutDraft(null);
    }

    // Selection box: compute selected nodes
    if (selectionBox) {
      const graph = state.graphs.find(g => g.id === selectionBox.graphId);
      if (graph) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        // Only select if the box has some size (not just a click)
        if (maxX - minX > 5 || maxY - minY > 5) {
          const inside = new Set<string>();
          for (const node of graph.nodes) {
            const nx = node.x ?? 0;
            const ny = node.y ?? 0;
            if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
              inside.add(node.id);
            }
          }
          setSelectedNodes(inside);
        } else {
          // Tiny box = click on empty space, clear selection
          setSelectedNodes(new Set());
        }
      }
      setSelectionBox(null);
    }
  }, [edgeDraft, cutDraft, selectionBox, state.graphs, state.activeGraphId, findNearestNode, addEdge, addCut]);

  // ── Node interaction handlers ──

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, graphId: string, nodeId: string) => {
    e.stopPropagation();
    setActiveGraph(graphId);
    setContextMenu(null);

    // Edge mode: start edge draft
    if (state.canvasMode === 'edge') {
      const node = state.graphs.find(g => g.id === graphId)?.nodes.find(n => n.id === nodeId);
      if (node) {
        setEdgeDraft({
          sourceNodeId: nodeId,
          sourceGraphId: graphId,
          cursorX: node.x ?? 0,
          cursorY: node.y ?? 0,
        });
      }
      return;
    }

    // Select mode: drag node(s)
    if (state.canvasMode === 'select') {
      isDraggingNode.current = true;

      // Handle selection
      let currentSelection: Set<string>;
      if (e.shiftKey) {
        // Shift+click toggles node in selection
        currentSelection = new Set(selectedNodes);
        if (currentSelection.has(nodeId)) {
          currentSelection.delete(nodeId);
        } else {
          currentSelection.add(nodeId);
        }
        setSelectedNodes(currentSelection);
        return; // Just toggle, don't start drag on shift+click
      } else if (selectedNodes.has(nodeId)) {
        // Already selected, keep selection for group drag
        currentSelection = selectedNodes;
      } else {
        // Not selected, clear and select only this one
        currentSelection = new Set([nodeId]);
        setSelectedNodes(currentSelection);
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const svg = svgRef.current;
      if (!svg) return;
      const transform = d3.zoomTransform(svg);

      // Capture original positions of all selected nodes
      const graph = state.graphs.find(g => g.id === graphId);
      if (!graph) return;
      const origPositions = new Map<string, { x: number; y: number }>();
      for (const nid of currentSelection) {
        const n = graph.nodes.find(nd => nd.id === nid);
        if (n) origPositions.set(nid, { x: n.x ?? 0, y: n.y ?? 0 });
      }

      const onMove = (me: MouseEvent) => {
        const dx = (me.clientX - startX) / transform.k;
        const dy = (me.clientY - startY) / transform.k;
        for (const [nid, orig] of origPositions) {
          updateNodePosition(graphId, nid, orig.x + dx, orig.y + dy);
        }
      };

      const onUp = () => {
        isDraggingNode.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  }, [state.canvasMode, state.graphs, selectedNodes, setActiveGraph, updateNodePosition]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, graphId: string, nodeId: string) => {
    e.stopPropagation();
    const node = state.graphs.find(g => g.id === graphId)?.nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingLabel({ graphId, nodeId });
      setEditValue(node.label);
    }
  }, [state.graphs]);

  const handleEdgeDoubleClick = useCallback((e: React.MouseEvent, graphId: string, edgeId: string) => {
    e.stopPropagation();
    const edge = state.graphs.find(g => g.id === graphId)?.edges.find(ed => ed.id === edgeId);
    if (edge) {
      setEditingEdge({ graphId, edgeId, field: 'capacity' });
      setEditValue(String(edge.capacity));
    }
  }, [state.graphs]);

  const commitLabelEdit = useCallback(() => {
    if (editingLabel && editValue.trim()) {
      updateNodeLabel(editingLabel.graphId, editingLabel.nodeId, editValue.trim());
    }
    setEditingLabel(null);
  }, [editingLabel, editValue, updateNodeLabel]);

  const commitEdgeEdit = useCallback(() => {
    if (editingEdge && editValue.trim()) {
      const num = Number(editValue);
      if (!isNaN(num)) {
        if (editingEdge.field === 'capacity') {
          updateEdgeCapacity(editingEdge.graphId, editingEdge.edgeId, num);
        } else {
          updateEdgeFlow(editingEdge.graphId, editingEdge.edgeId, num);
        }
      }
    }
    setEditingEdge(null);
  }, [editingEdge, editValue, updateEdgeCapacity, updateEdgeFlow]);

  // ── Context menu ──

  const handleContextMenu = useCallback((e: React.MouseEvent, graphId: string, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setContextMenu({
      graphId,
      nodeId,
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
    });
  }, []);

  const handleEdgeContextMenu = useCallback((e: React.MouseEvent, graphId: string, edgeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeEdge(graphId, edgeId);
  }, [removeEdge]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const contextMenuAction = useCallback((action: string) => {
    if (!contextMenu) return;
    const { graphId, nodeId } = contextMenu;
    switch (action) {
      case 'set-source': setSource(graphId, nodeId); break;
      case 'set-sink': setSink(graphId, nodeId); break;
      case 'clear-role':
        const graph = state.graphs.find(g => g.id === graphId);
        if (graph) {
          if (nodeId === graph.sourceId) setSource(graphId, '');
          if (nodeId === graph.sinkId) setSink(graphId, '');
        }
        break;
      case 'delete': removeNode(graphId, nodeId); break;
    }
    setContextMenu(null);
  }, [contextMenu, state.graphs, setSource, setSink, removeNode]);

  // Cursor style
  const getCursor = () => {
    if (edgeDraft) return 'crosshair';
    if (state.canvasMode === 'edge') return 'crosshair';
    if (state.canvasMode === 'cut') return 'crosshair';
    return 'default';
  };

  const renderCuts = (graphCuts: Cut[]) => {
    return graphCuts.map(cut => (
      <g key={cut.id}>
        <line
          x1={cut.lineStart.x} y1={cut.lineStart.y}
          x2={cut.lineEnd.x} y2={cut.lineEnd.y}
          stroke={COLORS.cutLine}
          strokeWidth={2}
          strokeDasharray="8,4"
          style={{ animation: 'cut-dash 0.8s linear infinite' }}
        />
      </g>
    ));
  };

  // Determine snap target for edge draft
  const draftSnapTarget = edgeDraft
    ? findNearestNode(edgeDraft.cursorX, edgeDraft.cursorY, edgeDraft.sourceGraphId, edgeDraft.sourceNodeId)
    : null;

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={contextMenu ? closeContextMenu : undefined}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        background: `
          radial-gradient(circle, ${COLORS.bgDot} 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        backgroundColor: COLORS.bg,
        cursor: getCursor(),
      }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        <defs>
          {/* Arrow markers */}
          {[
            { id: 'arrow-default', color: COLORS.edgeDefault },
            { id: 'arrow-flow', color: COLORS.edgeFlow },
            { id: 'arrow-full', color: COLORS.edgeFull },
            { id: 'arrow-path', color: COLORS.edgePath },
            { id: 'arrow-updating', color: COLORS.edgeUpdating },
            { id: 'arrow-validation-error', color: COLORS.validationError },
          ].map(m => (
            <marker key={m.id} id={m.id} viewBox="0 -5 10 10"
              refX={32} refY={0} markerWidth={8} markerHeight={8} orient="auto">
              <path d="M0,-5L10,0L0,5" fill={m.color} />
            </marker>
          ))}
          {/* Draft edge arrow */}
          <marker id="arrow-draft" viewBox="0 -5 10 10"
            refX={8} refY={0} markerWidth={8} markerHeight={8} orient="auto">
            <path d="M0,-4L8,0L0,4" fill={COLORS.blue} opacity={0.7} />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g ref={gRef}>
          {state.graphs.map((graph, gi) => {
            const isActive = graph.id === state.activeGraphId;
            const graphCuts = state.cuts.filter(c => c.graphId === graph.id);
            const accentColor = COLORS.graphAccents[gi % COLORS.graphAccents.length];

            return (
              <g key={graph.id} onClick={() => setActiveGraph(graph.id)}>
                {/* Cut partition highlights */}
                {graphCuts.map(cut => (
                  <g key={`partition-${cut.id}`}>
                    {graph.nodes.map(n => {
                      const inA = cut.setA.includes(n.id);
                      const inB = cut.setB.includes(n.id);
                      if (!inA && !inB) return null;
                      return (
                        <circle
                          key={`part-${n.id}`}
                          cx={n.x ?? 0}
                          cy={n.y ?? 0}
                          r={32}
                          fill={inA ? COLORS.cutSetA : COLORS.cutSetB}
                        />
                      );
                    })}
                  </g>
                ))}

                {/* Edges */}
                {graph.edges.map(edge => {
                  const path = getEdgePath(edge, graph);
                  if (!path) return null;
                  const color = getEdgeColor(edge, graph);
                  const markerUrl = color === COLORS.edgeUpdating ? 'url(#arrow-updating)'
                    : color === COLORS.edgePath ? 'url(#arrow-path)'
                    : color === COLORS.edgeFull ? 'url(#arrow-full)'
                    : color === COLORS.edgeFlow ? 'url(#arrow-flow)'
                    : color === COLORS.validationError ? 'url(#arrow-validation-error)'
                    : 'url(#arrow-default)';

                  const isValidationError = color === COLORS.validationError;
                  const strokeWidth = isGenerated && currentStep?.highlights.pathEdges?.includes(edge.id) ? 3.5
                    : isGenerated && currentStep?.highlights.activeEdge === edge.id ? 4
                    : 2;

                  if (path.type === 'line') {
                    return (
                      <line key={edge.id}
                        x1={path.sx} y1={path.sy}
                        x2={path.tx} y2={path.ty}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        markerEnd={markerUrl}
                        strokeDasharray={isValidationError ? '4,3' : undefined}
                        style={{ cursor: 'pointer', transition: 'stroke 0.2s, stroke-width 0.2s' }}
                        onContextMenu={e => handleEdgeContextMenu(e, graph.id, edge.id)}
                      />
                    );
                  }

                  return (
                    <path key={edge.id}
                      d={`M${path.sx},${path.sy} Q${path.cx},${path.cy} ${path.tx},${path.ty}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeWidth}
                      markerEnd={markerUrl}
                      strokeDasharray={isValidationError ? '4,3' : undefined}
                      style={{ cursor: 'pointer', transition: 'stroke 0.2s, stroke-width 0.2s' }}
                      onContextMenu={e => handleEdgeContextMenu(e, graph.id, edge.id)}
                    />
                  );
                })}

                {/* Edge labels */}
                {graph.edges.map(edge => {
                  const pos = getEdgeLabelPos(edge, graph);
                  const color = getEdgeColor(edge, graph);
                  const flow = getEdgeFlow(edge);
                  const isEditingThis = editingEdge?.graphId === graph.id && editingEdge?.edgeId === edge.id;

                  return (
                    <g key={`label-${edge.id}`}
                      onDoubleClick={e => handleEdgeDoubleClick(e, graph.id, edge.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={pos.x - 24} y={pos.y - 10}
                        width={48} height={20}
                        rx={4} ry={4}
                        fill={COLORS.bg}
                        stroke={COLORS.border}
                        strokeWidth={0.5}
                      />
                      {isEditingThis ? (
                        <foreignObject x={pos.x - 24} y={pos.y - 10} width={48} height={20}>
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={commitEdgeEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitEdgeEdit();
                              if (e.key === 'Escape') setEditingEdge(null);
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                if (editingEdge?.field === 'capacity') {
                                  commitEdgeEdit();
                                  const edgeData = graph.edges.find(ed => ed.id === editingEdge.edgeId);
                                  if (edgeData) {
                                    setEditingEdge({ ...editingEdge, field: 'flow' });
                                    setEditValue(String(edgeData.flow));
                                  }
                                } else {
                                  commitEdgeEdit();
                                }
                              }
                            }}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: COLORS.surface,
                              color: COLORS.text,
                              border: `1px solid ${COLORS.blue}`,
                              borderRadius: 3,
                              textAlign: 'center',
                              fontSize: 10,
                              fontFamily: FONTS.mono,
                              padding: 0,
                              outline: 'none',
                            }}
                          />
                        </foreignObject>
                      ) : (
                        <text
                          x={pos.x} y={pos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={color !== COLORS.edgeDefault ? color : COLORS.textSecondary}
                          fontSize={11}
                          fontFamily={FONTS.mono}
                          fontWeight={500}
                          style={{ pointerEvents: 'none' }}
                        >
                          {flow} / {edge.capacity}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Cut lines */}
                {renderCuts(graphCuts)}

                {/* Nodes */}
                {graph.nodes.map(node => {
                  const nx = node.x ?? 0;
                  const ny = node.y ?? 0;
                  const fill = getNodeFill(node.id, graph);
                  const stroke = getNodeStroke(node.id, graph);
                  const isEditingThis = editingLabel?.graphId === graph.id && editingLabel?.nodeId === node.id;
                  const isSelected = selectedNodes.has(node.id);
                  const isHovered = hoveredNode?.graphId === graph.id && hoveredNode?.nodeId === node.id;
                  const isSnapTarget = draftSnapTarget?.nodeId === node.id && edgeDraft?.sourceGraphId === graph.id;

                  return (
                    <g key={node.id}
                      onMouseDown={e => handleNodeMouseDown(e, graph.id, node.id)}
                      onDoubleClick={e => handleNodeDoubleClick(e, graph.id, node.id)}
                      onContextMenu={e => handleContextMenu(e, graph.id, node.id)}
                      style={{ cursor: state.canvasMode === 'select' ? 'grab' : 'pointer' }}
                    >
                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          cx={nx} cy={ny} r={NODE_RADIUS + 5}
                          fill="none"
                          stroke={COLORS.blue}
                          strokeWidth={1.5}
                          strokeDasharray="4,3"
                          opacity={0.6}
                        />
                      )}
                      {/* Hover glow ring */}
                      {(isHovered || isSnapTarget) && !isSelected && (
                        <circle
                          cx={nx} cy={ny} r={NODE_RADIUS + 6}
                          fill="none"
                          stroke={isSnapTarget ? COLORS.blue : COLORS.textMuted}
                          strokeWidth={isSnapTarget ? 2 : 1}
                          opacity={isSnapTarget ? 0.6 : 0.3}
                        />
                      )}
                      <circle
                        cx={nx} cy={ny} r={NODE_RADIUS}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isActive ? 3 : 2}
                        style={{ transition: 'fill 0.2s, stroke 0.2s' }}
                      />
                      {/* Accent line at bottom for multi-graph distinction */}
                      {state.graphs.length > 1 && (
                        <path
                          d={`M${nx - 14},${ny + 16} A22,22 0 0,0 ${nx + 14},${ny + 16}`}
                          fill="none"
                          stroke={accentColor}
                          strokeWidth={2}
                          opacity={0.6}
                        />
                      )}
                      {/* Validation error indicator */}
                      {state.viewLens === 'validation' && (() => {
                        const val = validateFlow(graph);
                        const nv = val.nodeResults.find(r => r.nodeId === node.id);
                        if (nv && !nv.isConserved) {
                          return (
                            <g>
                              <circle cx={nx + 15} cy={ny - 15} r={6} fill={COLORS.validationError} />
                              <text x={nx + 15} y={ny - 15} textAnchor="middle" dominantBaseline="central"
                                fill="#fff" fontSize={9} fontWeight={700} fontFamily={FONTS.sans}>!</text>
                            </g>
                          );
                        }
                        return null;
                      })()}
                      {isEditingThis ? (
                        <foreignObject x={nx - 20} y={ny - 10} width={40} height={20}>
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={commitLabelEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitLabelEdit();
                              if (e.key === 'Escape') setEditingLabel(null);
                            }}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'transparent',
                              color: COLORS.text,
                              border: 'none',
                              textAlign: 'center',
                              fontSize: 14,
                              fontFamily: FONTS.sans,
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          />
                        </foreignObject>
                      ) : (
                        <text
                          x={nx} y={ny}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={COLORS.text}
                          fontSize={14}
                          fontFamily={FONTS.sans}
                          fontWeight={600}
                          style={{ pointerEvents: 'none' }}
                        >
                          {node.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Edge draft line */}
          {edgeDraft && (() => {
            const graph = state.graphs.find(g => g.id === edgeDraft.sourceGraphId);
            const sNode = graph?.nodes.find(n => n.id === edgeDraft.sourceNodeId);
            if (!sNode) return null;
            return (
              <line
                x1={sNode.x ?? 0} y1={sNode.y ?? 0}
                x2={edgeDraft.cursorX} y2={edgeDraft.cursorY}
                stroke={COLORS.blue}
                strokeWidth={2}
                strokeDasharray="6,4"
                markerEnd="url(#arrow-draft)"
                opacity={0.7}
                style={{ pointerEvents: 'none' }}
              />
            );
          })()}

          {/* Cut draft line */}
          {cutDraft && (
            <line
              x1={cutDraft.startX} y1={cutDraft.startY}
              x2={cutDraft.endX} y2={cutDraft.endY}
              stroke={COLORS.cutLine}
              strokeWidth={2}
              strokeDasharray="8,4"
              opacity={0.7}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Selection box */}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.startX, selectionBox.endX)}
              y={Math.min(selectionBox.startY, selectionBox.endY)}
              width={Math.abs(selectionBox.endX - selectionBox.startX)}
              height={Math.abs(selectionBox.endY - selectionBox.startY)}
              fill="rgba(59,130,246,0.08)"
              stroke={COLORS.blue}
              strokeWidth={1}
              strokeDasharray="4,3"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>

      {/* Context menu popover */}
      {contextMenu && (() => {
        const graph = state.graphs.find(g => g.id === contextMenu.graphId);
        if (!graph) return null;
        const node = graph.nodes.find(n => n.id === contextMenu.nodeId);
        if (!node) return null;
        const isSource = contextMenu.nodeId === graph.sourceId;
        const isSink = contextMenu.nodeId === graph.sinkId;

        const menuItemStyle = {
          display: 'block',
          width: '100%',
          padding: '6px 12px',
          background: 'transparent',
          border: 'none',
          color: COLORS.text,
          fontSize: 11,
          fontFamily: FONTS.sans,
          textAlign: 'left' as const,
          cursor: 'pointer' as const,
        };

        return (
          <div
            style={{
              position: 'absolute',
              left: contextMenu.screenX,
              top: contextMenu.screenY,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: '4px 0',
              minWidth: 140,
              zIndex: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '4px 12px 6px', fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono }}>
              {node.label}
            </div>
            {!isSource && (
              <button style={menuItemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = COLORS.surfaceHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => contextMenuAction('set-source')}>
                Set as Source
              </button>
            )}
            {!isSink && (
              <button style={menuItemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = COLORS.surfaceHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => contextMenuAction('set-sink')}>
                Set as Sink
              </button>
            )}
            {(isSource || isSink) && (
              <button style={menuItemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = COLORS.surfaceHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => contextMenuAction('clear-role')}>
                Clear Role
              </button>
            )}
            <div style={{ height: 1, background: COLORS.border, margin: '4px 0' }} />
            <button style={{ ...menuItemStyle, color: COLORS.red }}
              onMouseEnter={e => (e.currentTarget.style.background = COLORS.surfaceHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => contextMenuAction('delete')}>
              Delete Node
            </button>
          </div>
        );
      })()}

      {/* Cut measurement boxes */}
      {state.cuts.map(cut => {
        const graph = state.graphs.find(g => g.id === cut.graphId);
        if (!graph) return null;

        const svg = svgRef.current;
        if (!svg) return null;
        const transform = d3.zoomTransform(svg);
        const midX = (cut.lineStart.x + cut.lineEnd.x) / 2;
        const midY = (cut.lineStart.y + cut.lineEnd.y) / 2;
        const [screenX, screenY] = transform.apply([midX, midY]);

        return (
          <div key={`measure-${cut.id}`} style={{
            position: 'absolute',
            left: screenX + 20,
            top: screenY - 60,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            minWidth: 180,
            fontSize: 11,
            fontFamily: FONTS.mono,
            color: COLORS.text,
            zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', color: COLORS.textMuted, letterSpacing: '0.08em' }}>
                Cut Analysis
              </span>
              <button onClick={() => removeCut(cut.id)} style={{
                background: 'transparent',
                border: 'none',
                color: COLORS.textMuted,
                cursor: 'pointer',
                fontSize: 12,
                padding: '0 2px',
              }}>
                x
              </button>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: COLORS.textMuted }}>Source side (A): </span>
              {cut.setA.map(id => {
                const n = graph.nodes.find(nd => nd.id === id);
                return (
                  <span key={id} style={{
                    display: 'inline-block',
                    background: COLORS.cutSetA,
                    color: COLORS.blue,
                    padding: '1px 5px',
                    borderRadius: 3,
                    marginRight: 3,
                    fontSize: 10,
                  }}>
                    {n?.label ?? id}
                  </span>
                );
              })}
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: COLORS.textMuted }}>Sink side (B): </span>
              {cut.setB.map(id => {
                const n = graph.nodes.find(nd => nd.id === id);
                return (
                  <span key={id} style={{
                    display: 'inline-block',
                    background: COLORS.cutSetB,
                    color: COLORS.purple,
                    padding: '1px 5px',
                    borderRadius: 3,
                    marginRight: 3,
                    fontSize: 10,
                  }}>
                    {n?.label ?? id}
                  </span>
                );
              })}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: COLORS.amber,
              marginBottom: 4,
            }}>
              Cut capacity: {cut.cutCapacity}
            </div>
            <div style={{
              fontSize: 9,
              color: COLORS.textMuted,
              fontStyle: 'italic',
              fontFamily: FONTS.sans,
              lineHeight: 1.4,
            }}>
              Max-Flow Min-Cut Theorem: The maximum flow equals the minimum cut capacity.
            </div>
          </div>
        );
      })}

      {/* Help button + overlay */}
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 15 }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={e => { e.stopPropagation(); setShowHelp(!showHelp); }}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textMuted,
            fontSize: 12,
            fontFamily: FONTS.sans,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ?
        </button>
        {showHelp && (
          <div style={{
            position: 'absolute',
            top: 30,
            right: 0,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: '10px 14px',
            minWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.06em' }}>
              Shortcuts
            </div>
            {[
              ['Drag node', 'Move node (or group)'],
              ['Click canvas', 'Draw selection box'],
              ['Shift+click node', 'Toggle selection'],
              ['Shift+drag canvas', 'Pan view'],
              ['Scroll', 'Zoom in/out'],
              ['Double-click node', 'Rename node'],
              ['Double-click edge', 'Edit capacity'],
              ['Right-click node', 'Context menu'],
              ['Edge mode', 'Drag between nodes'],
              ['Cut mode', 'Draw cut line'],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.text, minWidth: 110, flexShrink: 0 }}>{key}</span>
                <span style={{ fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted }}>{desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
