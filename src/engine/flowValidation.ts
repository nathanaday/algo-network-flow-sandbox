import { Graph } from '../types/graph';
import { FlowValidation, NodeValidation, EdgeValidation } from '../types/sandbox';

export function validateFlow(graph: Graph): FlowValidation {
  const edgeResults: EdgeValidation[] = graph.edges.map(edge => ({
    edgeId: edge.id,
    flow: edge.flow,
    capacity: edge.capacity,
    exceedsCapacity: edge.flow > edge.capacity,
    negativeFlow: edge.flow < 0,
  }));

  const nodeResults: NodeValidation[] = graph.nodes.map(node => {
    const inflow = graph.edges
      .filter(e => e.target === node.id)
      .reduce((sum, e) => sum + e.flow, 0);
    const outflow = graph.edges
      .filter(e => e.source === node.id)
      .reduce((sum, e) => sum + e.flow, 0);
    const isSourceOrSink = node.id === graph.sourceId || node.id === graph.sinkId;
    const isConserved = isSourceOrSink || Math.abs(inflow - outflow) < 0.0001;
    return { nodeId: node.id, inflow, outflow, isConserved };
  });

  const totalSourceOutflow = graph.edges
    .filter(e => e.source === graph.sourceId)
    .reduce((sum, e) => sum + e.flow, 0);
  const totalSinkInflow = graph.edges
    .filter(e => e.target === graph.sinkId)
    .reduce((sum, e) => sum + e.flow, 0);

  const isValid = edgeResults.every(e => !e.exceedsCapacity && !e.negativeFlow)
    && nodeResults.every(n => n.isConserved);

  return { isValid, nodeResults, edgeResults, totalSourceOutflow, totalSinkInflow };
}
