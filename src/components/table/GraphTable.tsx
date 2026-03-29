import { useState } from 'react';
import { COLORS, FONTS } from '../../styles/theme';
import { Graph } from '../../types/graph';
import { useSandbox } from '../../context/SandboxContext';
import { usePersistence } from '../../context/PersistenceContext';
import { validateFlow } from '../../engine/flowValidation';

interface Props {
  graph: Graph;
  isActive: boolean;
  accentColor: string;
}

export default function GraphTable({ graph, isActive, accentColor }: Props) {
  const {
    state, setActiveGraph, renameGraph, removeNode, addNode,
    addEdge, removeEdge, updateEdgeCapacity, updateEdgeFlow,
    updateNodeLabel, setSource, setSink, cloneGraph, removeGraph,
  } = useSandbox();
  const { saveGraph } = usePersistence();
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newEdgeFrom, setNewEdgeFrom] = useState('');
  const [newEdgeTo, setNewEdgeTo] = useState('');
  const [newEdgeCap, setNewEdgeCap] = useState(10);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(graph.name);

  const validation = state.viewLens === 'validation' ? validateFlow(graph) : null;
  const isValid = validation?.isValid ?? true;

  const cellStyle = {
    padding: '3px 6px',
    fontSize: 11,
    fontFamily: FONTS.mono,
    borderBottom: `1px solid ${COLORS.border}`,
  };

  const inputStyle = {
    background: COLORS.bg,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 11,
    fontFamily: FONTS.mono,
    outline: 'none',
    width: '100%',
  };

  const smallBtn = {
    background: 'transparent',
    border: 'none',
    color: COLORS.textMuted,
    cursor: 'pointer',
    fontSize: 10,
    padding: '2px 4px',
  };

  return (
    <div
      onClick={() => setActiveGraph(graph.id)}
      style={{
        background: COLORS.surface,
        borderRadius: 8,
        border: `1px solid ${isActive ? accentColor : COLORS.border}`,
        padding: 10,
        marginBottom: 8,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}>
        {!isValid && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: COLORS.validationError, flexShrink: 0,
          }} />
        )}
        <div style={{
          width: 3, height: 14, borderRadius: 2,
          background: accentColor, flexShrink: 0,
        }} />
        {isEditingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={() => { renameGraph(graph.id, nameValue); setIsEditingName(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { renameGraph(graph.id, nameValue); setIsEditingName(false); }
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            style={{
              ...inputStyle,
              flex: 1,
              fontSize: 12,
              fontFamily: FONTS.sans,
              fontWeight: 600,
            }}
          />
        ) : (
          <span
            onDoubleClick={() => { setIsEditingName(true); setNameValue(graph.name); }}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: FONTS.sans,
              color: COLORS.text,
              cursor: 'text',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {graph.name}
          </span>
        )}
        <button style={smallBtn} onClick={e => { e.stopPropagation(); saveGraph(graph); }} title="Save">
          save
        </button>
        <button style={smallBtn} onClick={e => { e.stopPropagation(); cloneGraph(graph.id); }} title="Clone">
          clone
        </button>
        {state.graphs.length > 1 && (
          <button style={{ ...smallBtn, color: COLORS.red }} onClick={e => { e.stopPropagation(); removeGraph(graph.id); }} title="Delete">
            x
          </button>
        )}
      </div>

      {!isValid && validation && (
        <div style={{
          fontSize: 10,
          color: COLORS.validationError,
          fontFamily: FONTS.mono,
          marginBottom: 6,
        }}>
          Flow constraints violated
        </div>
      )}

      {/* Nodes table */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: 'uppercase', marginBottom: 4 }}>
          Nodes
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: COLORS.textMuted, fontSize: 9 }}>
              <th style={{ ...cellStyle, textAlign: 'left' }}>Label</th>
              <th style={{ ...cellStyle, textAlign: 'center', width: 50 }}>Role</th>
              <th style={{ ...cellStyle, textAlign: 'center', width: 24 }}></th>
            </tr>
          </thead>
          <tbody>
            {graph.nodes.map(node => {
              const nv = validation?.nodeResults.find(r => r.nodeId === node.id);
              const hasError = nv && !nv.isConserved;
              return (
                <tr key={node.id} style={{
                  background: hasError ? COLORS.validationErrorBg : undefined,
                }}>
                  <td style={cellStyle}>
                    <input
                      value={node.label}
                      onChange={e => updateNodeLabel(graph.id, node.id, e.target.value)}
                      style={{ ...inputStyle, width: 60 }}
                    />
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <select
                      value={node.id === graph.sourceId ? 'source' : node.id === graph.sinkId ? 'sink' : 'regular'}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === 'source') setSource(graph.id, node.id);
                        else if (v === 'sink') setSink(graph.id, node.id);
                        else {
                          if (node.id === graph.sourceId) setSource(graph.id, '');
                          if (node.id === graph.sinkId) setSink(graph.id, '');
                        }
                      }}
                      style={{
                        ...inputStyle,
                        width: 50,
                        padding: '1px 2px',
                        color: node.id === graph.sourceId ? COLORS.nodeSource
                          : node.id === graph.sinkId ? COLORS.nodeSink
                          : COLORS.textSecondary,
                      }}
                    >
                      <option value="regular">--</option>
                      <option value="source">SRC</option>
                      <option value="sink">SNK</option>
                    </select>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <button style={smallBtn} onClick={() => removeNode(graph.id, node.id)}>x</button>
                  </td>
                </tr>
              );
            })}
            {/* Add node row */}
            <tr>
              <td style={cellStyle} colSpan={2}>
                <input
                  placeholder="Label..."
                  value={newNodeLabel}
                  onChange={e => setNewNodeLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newNodeLabel.trim()) {
                      addNode(graph.id, newNodeLabel.trim());
                      setNewNodeLabel('');
                    }
                  }}
                  style={inputStyle}
                />
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                <button style={{
                  ...smallBtn,
                  color: COLORS.blue,
                }} onClick={() => {
                  if (newNodeLabel.trim()) {
                    addNode(graph.id, newNodeLabel.trim());
                    setNewNodeLabel('');
                  }
                }}>+</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Edges table */}
      <div>
        <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: 'uppercase', marginBottom: 4 }}>
          Edges
        </div>
        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: COLORS.textMuted, fontSize: 9 }}>
                <th style={{ ...cellStyle, textAlign: 'left' }}>From</th>
                <th style={{ ...cellStyle, textAlign: 'left' }}>To</th>
                <th style={{ ...cellStyle, textAlign: 'center', width: 42 }}>Cap</th>
                <th style={{ ...cellStyle, textAlign: 'center', width: 42 }}>Flow</th>
                <th style={{ ...cellStyle, textAlign: 'center', width: 24 }}></th>
              </tr>
            </thead>
            <tbody>
              {graph.edges.map(edge => {
                const ev = validation?.edgeResults.find(r => r.edgeId === edge.id);
                const hasError = ev && (ev.exceedsCapacity || ev.negativeFlow);
                const sLabel = graph.nodes.find(n => n.id === edge.source)?.label ?? edge.source;
                const tLabel = graph.nodes.find(n => n.id === edge.target)?.label ?? edge.target;
                return (
                  <tr key={edge.id} style={{
                    background: hasError ? COLORS.validationErrorBg : undefined,
                  }}>
                    <td style={cellStyle}>
                      <span style={{ color: COLORS.textSecondary, fontSize: 10 }}>{sLabel}</span>
                    </td>
                    <td style={cellStyle}>
                      <span style={{ color: COLORS.textSecondary, fontSize: 10 }}>{tLabel}</span>
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <input
                        type="number"
                        value={edge.capacity}
                        onChange={e => updateEdgeCapacity(graph.id, edge.id, Number(e.target.value))}
                        style={{ ...inputStyle, width: 38, textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <input
                        type="number"
                        value={edge.flow}
                        onChange={e => updateEdgeFlow(graph.id, edge.id, Number(e.target.value))}
                        style={{ ...inputStyle, width: 38, textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button style={smallBtn} onClick={() => removeEdge(graph.id, edge.id)}>x</button>
                    </td>
                  </tr>
                );
              })}
              {/* Add edge row */}
              <tr>
                <td style={cellStyle}>
                  <select value={newEdgeFrom} onChange={e => setNewEdgeFrom(e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}>
                    <option value="">--</option>
                    {graph.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </td>
                <td style={cellStyle}>
                  <select value={newEdgeTo} onChange={e => setNewEdgeTo(e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}>
                    <option value="">--</option>
                    {graph.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <input type="number" value={newEdgeCap} onChange={e => setNewEdgeCap(Number(e.target.value))}
                    style={{ ...inputStyle, width: 38, textAlign: 'center' }} />
                </td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <button style={{ ...smallBtn, color: COLORS.blue }}
                    onClick={() => {
                      if (newEdgeFrom && newEdgeTo) {
                        addEdge(graph.id, newEdgeFrom, newEdgeTo, newEdgeCap);
                        setNewEdgeFrom('');
                        setNewEdgeTo('');
                      }
                    }}>+</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
