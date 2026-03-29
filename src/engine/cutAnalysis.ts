import { Graph } from '../types/graph';

interface Point {
  x: number;
  y: number;
}

interface CutResult {
  setA: string[];
  setB: string[];
  cutCapacity: number;
  crossingEdges: string[];
}

export function computeCutPartition(
  graph: Graph,
  lineStart: Point,
  lineEnd: Point
): CutResult | null {
  if (graph.nodes.length === 0) return null;

  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;

  let setA: string[] = [];
  let setB: string[] = [];

  for (const node of graph.nodes) {
    const nx = (node.x ?? 0) - lineStart.x;
    const ny = (node.y ?? 0) - lineStart.y;
    const cross = dx * ny - dy * nx;
    if (cross >= 0) {
      setA.push(node.id);
    } else {
      setB.push(node.id);
    }
  }

  // Ensure source in A, sink in B
  const sourceInA = setA.includes(graph.sourceId);
  const sourceInB = setB.includes(graph.sourceId);
  const sinkInA = setA.includes(graph.sinkId);
  const sinkInB = setB.includes(graph.sinkId);

  if (sourceInB && sinkInA) {
    [setA, setB] = [setB, setA];
  } else if ((sourceInA && sinkInA) || (sourceInB && sinkInB)) {
    return null;
  }

  const setASet = new Set(setA);
  const crossingEdges: string[] = [];
  let cutCapacity = 0;

  for (const edge of graph.edges) {
    if (setASet.has(edge.source) && !setASet.has(edge.target)) {
      crossingEdges.push(edge.id);
      cutCapacity += edge.capacity;
    }
  }

  return { setA, setB, cutCapacity, crossingEdges };
}
