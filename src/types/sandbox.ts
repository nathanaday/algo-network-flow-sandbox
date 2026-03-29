import { Graph } from './graph';

export type CanvasMode = 'select' | 'edge' | 'cut';
export type ViewLens = 'clean' | 'validation';

export interface Cut {
  id: string;
  graphId: string;
  lineStart: { x: number; y: number };
  lineEnd: { x: number; y: number };
  setA: string[];
  setB: string[];
  cutCapacity: number;
  crossingEdges: string[];
}

export interface NodeValidation {
  nodeId: string;
  inflow: number;
  outflow: number;
  isConserved: boolean;
}

export interface EdgeValidation {
  edgeId: string;
  flow: number;
  capacity: number;
  exceedsCapacity: boolean;
  negativeFlow: boolean;
}

export interface FlowValidation {
  isValid: boolean;
  nodeResults: NodeValidation[];
  edgeResults: EdgeValidation[];
  totalSourceOutflow: number;
  totalSinkInflow: number;
}

export interface SavedGraph {
  id: string;
  name: string;
  graph: Graph;
  createdAt: string;
  updatedAt: string;
  thumbnailDataUrl?: string;
}
