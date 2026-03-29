import { usePlayback } from '../../context/PlaybackContext';
import { COLORS, FONTS } from '../../styles/theme';

function VarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
      <span style={{
        fontSize: '11px',
        color: COLORS.purple,
        fontFamily: FONTS.mono,
        fontWeight: 600,
        minWidth: '80px',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '12px',
        color: COLORS.text,
        fontFamily: FONTS.mono,
        wordBreak: 'break-all',
      }}>
        {children}
      </span>
    </div>
  );
}

function NodeBadge({ id, color }: { id: string; color?: string }) {
  const c = color ?? COLORS.textSecondary;
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '11px',
      fontWeight: 600,
      color: c,
      background: `${c}20`,
      padding: '1px 6px',
      borderRadius: '3px',
      fontFamily: FONTS.mono,
      marginRight: '3px',
      marginBottom: '2px',
    }}>
      {id}
    </span>
  );
}

export default function VariablesPane() {
  const { currentStep, isGenerated } = usePlayback();

  if (!isGenerated || !currentStep) {
    return (
      <div style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        padding: '14px',
        overflow: 'auto',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: FONTS.sans,
          marginBottom: '8px',
        }}>
          Variables
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: '13px', fontFamily: FONTS.sans }}>
          No algorithm state to display.
        </div>
      </div>
    );
  }

  const v = currentStep.variables;

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      padding: '14px',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: FONTS.sans,
        marginBottom: '4px',
      }}>
        Variables
      </div>

      <VarRow label="max_flow">
        <span style={{
          fontSize: '18px',
          fontWeight: 700,
          color: COLORS.green,
        }}>
          {v.maxFlow}
        </span>
      </VarRow>

      <VarRow label="iteration">
        {v.iteration > 0 ? v.iteration : '--'}
      </VarRow>

      <VarRow label="bottleneck">
        {v.bottleneck !== null ? (
          <span style={{ color: COLORS.amber, fontWeight: 600 }}>{v.bottleneck}</span>
        ) : '--'}
      </VarRow>

      <VarRow label="current">
        {v.currentNode ? <NodeBadge id={v.currentNode} color={COLORS.blue} /> : '--'}
      </VarRow>

      <VarRow label="queue">
        {v.queue.length > 0 ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {v.queue.map((id, i) => <NodeBadge key={i} id={id} color={COLORS.blue} />)}
          </span>
        ) : '[ ]'}
      </VarRow>

      <VarRow label="visited">
        {v.visited.length > 0 ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {v.visited.map((id, i) => <NodeBadge key={i} id={id} color={COLORS.purple} />)}
          </span>
        ) : '{ }'}
      </VarRow>

      <VarRow label="parent">
        {Object.keys(v.parentMap).length > 0 ? (
          <span style={{ fontSize: '11px', color: COLORS.textSecondary }}>
            {Object.entries(v.parentMap)
              .filter(([, p]) => p !== null)
              .map(([child, parent]) => `${child}<-${parent}`)
              .join(', ')
            }
          </span>
        ) : '{ }'}
      </VarRow>
    </div>
  );
}
