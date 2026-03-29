import { COLORS, FONTS } from '../../styles/theme';
import { useSandbox } from '../../context/SandboxContext';
import GraphTable from './GraphTable';

export default function TabularPanel() {
  const { state } = useSandbox();

  return (
    <div style={{
      width: 340,
      flexShrink: 0,
      overflowY: 'auto',
      padding: '0 2px',
    }}>
      <div style={{
        fontSize: 9,
        fontFamily: FONTS.mono,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '8px 8px 6px',
      }}>
        Graphs ({state.graphs.length})
      </div>
      {state.graphs.map((graph, i) => (
        <GraphTable
          key={graph.id}
          graph={graph}
          isActive={graph.id === state.activeGraphId}
          accentColor={COLORS.graphAccents[i % COLORS.graphAccents.length]}
        />
      ))}
    </div>
  );
}
