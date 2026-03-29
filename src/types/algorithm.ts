export type StepType =
  | 'init'
  | 'bfs_start'
  | 'bfs_dequeue'
  | 'bfs_check_neighbor'
  | 'bfs_found_sink'
  | 'bfs_no_path'
  | 'trace_path'
  | 'calc_bottleneck'
  | 'update_edge'
  | 'add_to_maxflow'
  | 'algorithm_complete';

export interface HighlightState {
  activeNodes: string[];
  frontierNodes: string[];
  visitedNodes: string[];
  pathEdges: string[];
  activeEdge: string | null;
}

export interface VariableState {
  maxFlow: number;
  parentMap: Record<string, string | null>;
  queue: string[];
  visited: string[];
  currentNode: string | null;
  bottleneck: number | null;
  augmentingPath: string[];
  iteration: number;
}

export interface EdgeFlowState {
  flow: number;
  capacity: number;
}

export interface AlgorithmStep {
  index: number;
  type: StepType;
  codeLine: number;
  codeLineEnd?: number;
  description: string;
  variables: VariableState;
  highlights: HighlightState;
  edgeStates: Record<string, EdgeFlowState>;
}
