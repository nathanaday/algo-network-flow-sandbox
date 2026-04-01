import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Graph } from '../types/graph';
import { CanvasMode, ViewLens, EdgeLabelMode, Cut } from '../types/sandbox';
import { DEFAULT_GRAPH } from '../engine/defaultGraph';
import * as utils from '../engine/graphUtils';

interface SandboxState {
  graphs: Graph[];
  activeGraphId: string | null;
  canvasMode: CanvasMode;
  viewLens: ViewLens;
  edgeLabelMode: EdgeLabelMode;
  cuts: Cut[];
}

type Action =
  | { type: 'ADD_GRAPH'; graph: Graph }
  | { type: 'REMOVE_GRAPH'; graphId: string }
  | { type: 'CLONE_GRAPH'; graphId: string }
  | { type: 'SET_ACTIVE_GRAPH'; graphId: string | null }
  | { type: 'UPDATE_GRAPH'; graphId: string; updater: (g: Graph) => Graph }
  | { type: 'SET_CANVAS_MODE'; mode: CanvasMode }
  | { type: 'SET_VIEW_LENS'; lens: ViewLens }
  | { type: 'SET_EDGE_LABEL_MODE'; mode: EdgeLabelMode }
  | { type: 'ADD_CUT'; cut: Cut }
  | { type: 'REMOVE_CUT'; cutId: string }
  | { type: 'LOAD_GRAPH'; graph: Graph };

function reducer(state: SandboxState, action: Action): SandboxState {
  switch (action.type) {
    case 'ADD_GRAPH':
      return {
        ...state,
        graphs: [...state.graphs, action.graph],
        activeGraphId: action.graph.id,
      };
    case 'REMOVE_GRAPH': {
      const remaining = state.graphs.filter(g => g.id !== action.graphId);
      return {
        ...state,
        graphs: remaining,
        activeGraphId: state.activeGraphId === action.graphId
          ? (remaining[0]?.id ?? null)
          : state.activeGraphId,
        cuts: state.cuts.filter(c => c.graphId !== action.graphId),
      };
    }
    case 'CLONE_GRAPH': {
      const source = state.graphs.find(g => g.id === action.graphId);
      if (!source) return state;
      const cloned = utils.cloneGraph(source);
      cloned.nodes = cloned.nodes.map(n => ({
        ...n,
        x: (n.x ?? 0) + 80,
        y: (n.y ?? 0) + 40,
      }));
      return {
        ...state,
        graphs: [...state.graphs, cloned],
        activeGraphId: cloned.id,
      };
    }
    case 'SET_ACTIVE_GRAPH':
      return { ...state, activeGraphId: action.graphId };
    case 'UPDATE_GRAPH':
      return {
        ...state,
        graphs: state.graphs.map(g =>
          g.id === action.graphId ? action.updater(g) : g
        ),
      };
    case 'SET_CANVAS_MODE':
      return { ...state, canvasMode: action.mode };
    case 'SET_VIEW_LENS':
      return { ...state, viewLens: action.lens };
    case 'SET_EDGE_LABEL_MODE':
      return { ...state, edgeLabelMode: action.mode };
    case 'ADD_CUT':
      return { ...state, cuts: [...state.cuts, action.cut] };
    case 'REMOVE_CUT':
      return { ...state, cuts: state.cuts.filter(c => c.id !== action.cutId) };
    case 'LOAD_GRAPH': {
      const loaded = { ...action.graph, id: crypto.randomUUID() };
      return {
        ...state,
        graphs: [...state.graphs, loaded],
        activeGraphId: loaded.id,
      };
    }
    default:
      return state;
  }
}

const initialGraph = utils.cloneGraph(DEFAULT_GRAPH);

const initialState: SandboxState = {
  graphs: [initialGraph],
  activeGraphId: initialGraph.id,
  canvasMode: 'select',
  viewLens: 'clean',
  edgeLabelMode: 'full',
  cuts: [],
};

interface SandboxContextValue {
  state: SandboxState;
  addGraph: (graph?: Partial<Graph>) => string;
  removeGraph: (id: string) => void;
  cloneGraph: (id: string) => void;
  setActiveGraph: (id: string | null) => void;
  addNode: (graphId: string, label: string, x?: number, y?: number) => void;
  removeNode: (graphId: string, nodeId: string) => void;
  addEdge: (graphId: string, source: string, target: string, capacity: number) => void;
  removeEdge: (graphId: string, edgeId: string) => void;
  updateEdgeCapacity: (graphId: string, edgeId: string, capacity: number) => void;
  updateEdgeFlow: (graphId: string, edgeId: string, flow: number) => void;
  updateNodePosition: (graphId: string, nodeId: string, x: number, y: number) => void;
  updateNodeLabel: (graphId: string, nodeId: string, label: string) => void;
  setSource: (graphId: string, nodeId: string) => void;
  setSink: (graphId: string, nodeId: string) => void;
  renameGraph: (graphId: string, name: string) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setViewLens: (lens: ViewLens) => void;
  setEdgeLabelMode: (mode: EdgeLabelMode) => void;
  addCut: (cut: Cut) => void;
  removeCut: (cutId: string) => void;
  loadGraph: (graph: Graph) => void;
}

const SandboxCtx = createContext<SandboxContextValue | null>(null);

export function SandboxProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addGraph = useCallback((partial?: Partial<Graph>) => {
    const id = crypto.randomUUID();
    const graph: Graph = {
      id,
      name: partial?.name ?? 'Untitled Graph',
      nodes: partial?.nodes ?? [],
      edges: partial?.edges ?? [],
      sourceId: partial?.sourceId ?? '',
      sinkId: partial?.sinkId ?? '',
    };
    dispatch({ type: 'ADD_GRAPH', graph });
    return id;
  }, []);

  const removeGraph = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_GRAPH', graphId: id });
  }, []);

  const cloneGraphAction = useCallback((id: string) => {
    dispatch({ type: 'CLONE_GRAPH', graphId: id });
  }, []);

  const setActiveGraph = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_GRAPH', graphId: id });
  }, []);

  const updateGraph = useCallback((graphId: string, updater: (g: Graph) => Graph) => {
    dispatch({ type: 'UPDATE_GRAPH', graphId, updater });
  }, []);

  const addNode = useCallback((graphId: string, label: string, x?: number, y?: number) => {
    updateGraph(graphId, g => utils.addNode(g, label, x, y));
  }, [updateGraph]);

  const removeNode = useCallback((graphId: string, nodeId: string) => {
    updateGraph(graphId, g => utils.removeNode(g, nodeId));
  }, [updateGraph]);

  const addEdge = useCallback((graphId: string, source: string, target: string, capacity: number) => {
    updateGraph(graphId, g => utils.addEdge(g, source, target, capacity));
  }, [updateGraph]);

  const removeEdge = useCallback((graphId: string, edgeId: string) => {
    updateGraph(graphId, g => utils.removeEdge(g, edgeId));
  }, [updateGraph]);

  const updateEdgeCapacity = useCallback((graphId: string, edgeId: string, capacity: number) => {
    updateGraph(graphId, g => utils.updateEdgeCapacity(g, edgeId, capacity));
  }, [updateGraph]);

  const updateEdgeFlow = useCallback((graphId: string, edgeId: string, flow: number) => {
    updateGraph(graphId, g => utils.updateEdgeFlow(g, edgeId, flow));
  }, [updateGraph]);

  const updateNodePosition = useCallback((graphId: string, nodeId: string, x: number, y: number) => {
    updateGraph(graphId, g => utils.updateNodePosition(g, nodeId, x, y));
  }, [updateGraph]);

  const updateNodeLabel = useCallback((graphId: string, nodeId: string, label: string) => {
    updateGraph(graphId, g => utils.updateNodeLabel(g, nodeId, label));
  }, [updateGraph]);

  const setSource = useCallback((graphId: string, nodeId: string) => {
    updateGraph(graphId, g => utils.setSource(g, nodeId));
  }, [updateGraph]);

  const setSink = useCallback((graphId: string, nodeId: string) => {
    updateGraph(graphId, g => utils.setSink(g, nodeId));
  }, [updateGraph]);

  const renameGraph = useCallback((graphId: string, name: string) => {
    updateGraph(graphId, g => ({ ...g, name }));
  }, [updateGraph]);

  const setCanvasMode = useCallback((mode: CanvasMode) => {
    dispatch({ type: 'SET_CANVAS_MODE', mode });
  }, []);

  const setViewLens = useCallback((lens: ViewLens) => {
    dispatch({ type: 'SET_VIEW_LENS', lens });
  }, []);

  const setEdgeLabelMode = useCallback((mode: EdgeLabelMode) => {
    dispatch({ type: 'SET_EDGE_LABEL_MODE', mode });
  }, []);

  const addCut = useCallback((cut: Cut) => {
    dispatch({ type: 'ADD_CUT', cut });
  }, []);

  const removeCut = useCallback((cutId: string) => {
    dispatch({ type: 'REMOVE_CUT', cutId });
  }, []);

  const loadGraph = useCallback((graph: Graph) => {
    dispatch({ type: 'LOAD_GRAPH', graph });
  }, []);

  return (
    <SandboxCtx.Provider value={{
      state,
      addGraph, removeGraph, cloneGraph: cloneGraphAction, setActiveGraph,
      addNode, removeNode, addEdge, removeEdge,
      updateEdgeCapacity, updateEdgeFlow, updateNodePosition, updateNodeLabel,
      setSource, setSink, renameGraph,
      setCanvasMode, setViewLens, setEdgeLabelMode, addCut, removeCut, loadGraph,
    }}>
      {children}
    </SandboxCtx.Provider>
  );
}

export function useSandbox() {
  const ctx = useContext(SandboxCtx);
  if (!ctx) throw new Error('useSandbox must be used within SandboxProvider');
  return ctx;
}

export function useActiveGraph() {
  const { state, ...actions } = useSandbox();
  const graph = state.graphs.find(g => g.id === state.activeGraphId) ?? null;
  return { graph, ...actions, ...state };
}
