import { Graph } from '../types/graph';
import { AlgorithmStep, HighlightState, VariableState, EdgeFlowState } from '../types/algorithm';

function makeEdgeId(src: string, tgt: string): string {
  return `e-${src}-${tgt}`;
}

function emptyHighlights(): HighlightState {
  return {
    activeNodes: [],
    frontierNodes: [],
    visitedNodes: [],
    pathEdges: [],
    activeEdge: null,
  };
}

function emptyVariables(): VariableState {
  return {
    maxFlow: 0,
    parentMap: {},
    queue: [],
    visited: [],
    currentNode: null,
    bottleneck: null,
    augmentingPath: [],
    iteration: 0,
  };
}

export function generateSteps(graph: Graph): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const { sourceId, sinkId } = graph;

  // Build adjacency for residual graph
  type ResGraph = Record<string, Record<string, number>>;
  const residual: ResGraph = {};
  const originalEdges = new Set<string>();

  for (const node of graph.nodes) {
    residual[node.id] = {};
  }
  for (const edge of graph.edges) {
    residual[edge.source][edge.target] = (residual[edge.source][edge.target] || 0) + edge.capacity;
    if (!residual[edge.target][edge.source]) {
      residual[edge.target][edge.source] = 0;
    }
    originalEdges.add(makeEdgeId(edge.source, edge.target));
  }

  // Track flow on original edges
  const edgeFlows: Record<string, EdgeFlowState> = {};
  for (const edge of graph.edges) {
    edgeFlows[edge.id] = { flow: 0, capacity: edge.capacity };
  }

  function snapshotEdgeStates(): Record<string, EdgeFlowState> {
    const snap: Record<string, EdgeFlowState> = {};
    for (const key of Object.keys(edgeFlows)) {
      snap[key] = { ...edgeFlows[key] };
    }
    return snap;
  }

  function addStep(
    type: AlgorithmStep['type'],
    codeLine: number,
    description: string,
    vars: Partial<VariableState>,
    highlights: Partial<HighlightState>,
    codeLineEnd?: number,
  ) {
    const prev = steps.length > 0 ? steps[steps.length - 1].variables : emptyVariables();
    const variables: VariableState = {
      ...prev,
      ...vars,
    };
    const h: HighlightState = {
      ...emptyHighlights(),
      ...highlights,
    };
    steps.push({
      index: steps.length,
      type,
      codeLine,
      codeLineEnd,
      description,
      variables,
      highlights: h,
      edgeStates: snapshotEdgeStates(),
    });
  }

  // Step: Initialize
  addStep('init', 4, 'Initialize the residual graph from the original graph. Each edge gets its full capacity as residual capacity, and reverse edges start at 0.', {
    ...emptyVariables(),
  }, {});

  let maxFlow = 0;
  let iteration = 0;

  // BFS loop
  while (true) {
    iteration++;
    const parent: Record<string, string | null> = { [sourceId]: null };
    const visited: Set<string> = new Set([sourceId]);
    const queue: string[] = [sourceId];

    addStep('bfs_start', 10, `Iteration ${iteration}: Start BFS from source "${sourceId}". Initialize queue and visited set.`, {
      parentMap: { ...parent },
      queue: [...queue],
      visited: [...visited],
      currentNode: sourceId,
      bottleneck: null,
      augmentingPath: [],
      iteration,
    }, {
      activeNodes: [sourceId],
      frontierNodes: [sourceId],
      visitedNodes: [sourceId],
    });

    let foundSink = false;

    while (queue.length > 0) {
      const node = queue.shift()!;

      addStep('bfs_dequeue', 13, `Dequeue node "${node}" from the BFS queue. Examine its neighbors for available capacity.`, {
        queue: [...queue],
        currentNode: node,
      }, {
        activeNodes: [node],
        frontierNodes: [...queue],
        visitedNodes: [...visited],
      });

      const neighbors = Object.keys(residual[node] || {});
      for (const neighbor of neighbors) {
        const cap = residual[node][neighbor];
        if (!visited.has(neighbor) && cap > 0) {
          visited.add(neighbor);
          parent[neighbor] = node;
          queue.push(neighbor);

          if (neighbor === sinkId) {
            foundSink = true;

            addStep('bfs_found_sink', 17, `Found sink "${sinkId}"! An augmenting path exists from source to sink. Stop BFS.`, {
              parentMap: { ...parent },
              queue: [...queue],
              visited: [...visited],
              currentNode: neighbor,
            }, {
              activeNodes: [neighbor],
              frontierNodes: [...queue],
              visitedNodes: [...visited],
            });
            break;
          }

          addStep('bfs_check_neighbor', 15, `Discovered node "${neighbor}" via "${node}" with residual capacity ${cap}. Add to queue.`, {
            parentMap: { ...parent },
            queue: [...queue],
            visited: [...visited],
            currentNode: neighbor,
          }, {
            activeNodes: [node, neighbor],
            frontierNodes: [...queue],
            visitedNodes: [...visited],
          });
        }
      }

      if (foundSink) break;
    }

    if (!foundSink) {
      addStep('bfs_no_path', 20, `BFS complete. No augmenting path found from source to sink. The algorithm terminates. Maximum flow = ${maxFlow}.`, {
        currentNode: null,
        queue: [],
        augmentingPath: [],
      }, {
        visitedNodes: [...visited],
      });
      break;
    }

    // Trace augmenting path
    const path: string[] = [];
    let cur: string | null = sinkId;
    while (cur !== null) {
      path.unshift(cur);
      cur = parent[cur] ?? null;
    }

    const pathEdgeIds: string[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const eid = makeEdgeId(path[i], path[i + 1]);
      if (originalEdges.has(eid)) {
        pathEdgeIds.push(eid);
      }
    }

    addStep('trace_path', 23, `Trace augmenting path: ${path.join(' -> ')}. Now find the bottleneck (minimum residual capacity along this path).`, {
      augmentingPath: [...path],
      currentNode: null,
    }, {
      pathEdges: pathEdgeIds,
      visitedNodes: [...visited],
    });

    // Find bottleneck
    let bottleneck = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      bottleneck = Math.min(bottleneck, residual[path[i]][path[i + 1]]);
    }

    addStep('calc_bottleneck', 26, `Bottleneck = ${bottleneck}. This is the maximum additional flow we can push along this path.`, {
      bottleneck,
    }, {
      pathEdges: pathEdgeIds,
      visitedNodes: [...visited],
    });

    // Update residual graph and flow tracking
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      residual[u][v] -= bottleneck;
      residual[v][u] += bottleneck;

      // Update flow on original edges
      const fwdId = makeEdgeId(u, v);
      const revId = makeEdgeId(v, u);
      if (edgeFlows[fwdId]) {
        edgeFlows[fwdId].flow += bottleneck;
      } else if (edgeFlows[revId]) {
        edgeFlows[revId].flow -= bottleneck;
      }

      const updatedPathEdges: string[] = [];
      for (let j = 0; j < path.length - 1; j++) {
        const eid = makeEdgeId(path[j], path[j + 1]);
        if (originalEdges.has(eid)) updatedPathEdges.push(eid);
      }

      addStep('update_edge', 29, `Update edge ${u} -> ${v}: decrease forward residual by ${bottleneck}, increase reverse residual by ${bottleneck}.`, {
        currentNode: null,
      }, {
        pathEdges: updatedPathEdges,
        activeEdge: originalEdges.has(fwdId) ? fwdId : (originalEdges.has(revId) ? revId : null),
        visitedNodes: [...visited],
      });
    }

    maxFlow += bottleneck;

    addStep('add_to_maxflow', 32, `Add bottleneck ${bottleneck} to max flow. Total max flow is now ${maxFlow}.`, {
      maxFlow,
      bottleneck: null,
      augmentingPath: [],
      currentNode: null,
    }, {});
  }

  // Final step
  if (steps.length > 0 && steps[steps.length - 1].type !== 'bfs_no_path') {
    addStep('algorithm_complete', 34, `Algorithm complete. Maximum flow = ${maxFlow}.`, {
      maxFlow,
      currentNode: null,
      queue: [],
      augmentingPath: [],
    }, {});
  }

  return steps;
}
