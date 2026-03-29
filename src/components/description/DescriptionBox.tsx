import { usePlayback } from '../../context/PlaybackContext';
import { COLORS, FONTS } from '../../styles/theme';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  init: { label: 'INITIALIZE', color: COLORS.amber },
  bfs_start: { label: 'BFS START', color: COLORS.blue },
  bfs_dequeue: { label: 'BFS DEQUEUE', color: COLORS.blue },
  bfs_check_neighbor: { label: 'BFS EXPLORE', color: COLORS.blue },
  bfs_found_sink: { label: 'PATH FOUND', color: COLORS.green },
  bfs_no_path: { label: 'NO PATH', color: COLORS.red },
  trace_path: { label: 'TRACE PATH', color: COLORS.purple },
  calc_bottleneck: { label: 'BOTTLENECK', color: COLORS.amber },
  update_edge: { label: 'UPDATE FLOW', color: COLORS.amber },
  add_to_maxflow: { label: 'MAX FLOW', color: COLORS.green },
  algorithm_complete: { label: 'COMPLETE', color: COLORS.green },
};

export default function DescriptionBox() {
  const { currentStep, isGenerated } = usePlayback();

  const typeInfo = currentStep ? (TYPE_LABELS[currentStep.type] ?? { label: 'STEP', color: COLORS.textMuted }) : null;

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      overflow: 'auto',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: FONTS.sans,
      }}>
        Description
      </div>
      {!isGenerated ? (
        <div style={{ color: COLORS.textMuted, fontSize: '13px', fontFamily: FONTS.sans }}>
          Click "Run" to start the algorithm visualization.
        </div>
      ) : currentStep ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: typeInfo!.color,
              background: `${typeInfo!.color}18`,
              padding: '2px 8px',
              borderRadius: '3px',
              fontFamily: FONTS.mono,
              letterSpacing: '0.05em',
            }}>
              {typeInfo!.label}
            </span>
            <span style={{
              fontSize: '11px',
              color: COLORS.textMuted,
              fontFamily: FONTS.mono,
            }}>
              Step {currentStep.index + 1}
            </span>
          </div>
          <div style={{
            color: COLORS.text,
            fontSize: '13px',
            lineHeight: '1.5',
            fontFamily: FONTS.sans,
          }}>
            {currentStep.description}
          </div>
          {currentStep.variables.augmentingPath.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexWrap: 'wrap',
              marginTop: '4px',
            }}>
              <span style={{ fontSize: '11px', color: COLORS.textMuted, fontFamily: FONTS.mono }}>Path:</span>
              {currentStep.variables.augmentingPath.map((nodeId, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: COLORS.blue,
                    fontFamily: FONTS.mono,
                    background: COLORS.blueDim,
                    padding: '1px 6px',
                    borderRadius: '3px',
                  }}>
                    {nodeId}
                  </span>
                  {i < currentStep.variables.augmentingPath.length - 1 && (
                    <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>-&gt;</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
