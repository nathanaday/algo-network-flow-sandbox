import { Graph } from '../types/graph';

export const DEFAULT_GRAPH: Graph = {
  id: 'default',
  name: 'Default Graph',
  nodes: [
    { id: 's', label: 'S', x: 150, y: 300 },
    { id: 'a', label: 'A', x: 310, y: 180 },
    { id: 'b', label: 'B', x: 310, y: 420 },
    { id: 'c', label: 'C', x: 490, y: 180 },
    { id: 'd', label: 'D', x: 490, y: 420 },
    { id: 't', label: 'T', x: 650, y: 300 },
  ],
  edges: [
    { id: 'e-s-a', source: 's', target: 'a', capacity: 10, flow: 0 },
    { id: 'e-s-b', source: 's', target: 'b', capacity: 8, flow: 0 },
    { id: 'e-a-b', source: 'a', target: 'b', capacity: 5, flow: 0 },
    { id: 'e-a-c', source: 'a', target: 'c', capacity: 7, flow: 0 },
    { id: 'e-b-d', source: 'b', target: 'd', capacity: 10, flow: 0 },
    { id: 'e-c-d', source: 'c', target: 'd', capacity: 3, flow: 0 },
    { id: 'e-c-t', source: 'c', target: 't', capacity: 8, flow: 0 },
    { id: 'e-d-t', source: 'd', target: 't', capacity: 12, flow: 0 },
  ],
  sourceId: 's',
  sinkId: 't',
};
