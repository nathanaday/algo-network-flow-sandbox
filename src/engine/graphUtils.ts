import { Graph, GraphEdge } from '../types/graph';

export function addNode(graph: Graph, label: string, x?: number, y?: number): Graph {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  if (graph.nodes.some(n => n.id === id)) return graph;
  return {
    ...graph,
    nodes: [...graph.nodes, { id, label, x, y }],
  };
}

export function removeNode(graph: Graph, nodeId: string): Graph {
  if (nodeId === graph.sourceId || nodeId === graph.sinkId) return graph;
  return {
    ...graph,
    nodes: graph.nodes.filter(n => n.id !== nodeId),
    edges: graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
  };
}

export function addEdge(graph: Graph, source: string, target: string, capacity: number): Graph {
  if (source === target) return graph;
  if (graph.edges.some(e => e.source === source && e.target === target)) return graph;
  const id = `e-${source}-${target}`;
  const edge: GraphEdge = { id, source, target, capacity, flow: 0 };
  return {
    ...graph,
    edges: [...graph.edges, edge],
  };
}

export function removeEdge(graph: Graph, edgeId: string): Graph {
  return {
    ...graph,
    edges: graph.edges.filter(e => e.id !== edgeId),
  };
}

export function updateEdgeCapacity(graph: Graph, edgeId: string, capacity: number): Graph {
  return {
    ...graph,
    edges: graph.edges.map(e => e.id === edgeId ? { ...e, capacity: Math.max(1, capacity) } : e),
  };
}

export function setSource(graph: Graph, nodeId: string): Graph {
  if (nodeId === graph.sinkId) return graph;
  return { ...graph, sourceId: nodeId };
}

export function setSink(graph: Graph, nodeId: string): Graph {
  if (nodeId === graph.sourceId) return graph;
  return { ...graph, sinkId: nodeId };
}

export function resetFlows(graph: Graph): Graph {
  return {
    ...graph,
    edges: graph.edges.map(e => ({ ...e, flow: 0 })),
  };
}

export function cloneGraph(graph: Graph): Graph {
  return {
    id: crypto.randomUUID(),
    name: `${graph.name} (copy)`,
    nodes: graph.nodes.map(n => ({ ...n })),
    edges: graph.edges.map(e => ({ ...e })),
    sourceId: graph.sourceId,
    sinkId: graph.sinkId,
  };
}

export function updateEdgeFlow(graph: Graph, edgeId: string, flow: number): Graph {
  return {
    ...graph,
    edges: graph.edges.map(e => e.id === edgeId ? { ...e, flow } : e),
  };
}

export function updateNodePosition(graph: Graph, nodeId: string, x: number, y: number): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n),
  };
}

export function updateNodeLabel(graph: Graph, nodeId: string, newLabel: string): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map(n => n.id === nodeId ? { ...n, label: newLabel } : n),
  };
}
