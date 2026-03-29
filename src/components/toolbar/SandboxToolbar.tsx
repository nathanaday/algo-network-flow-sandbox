import { COLORS, FONTS } from '../../styles/theme';
import { useSandbox, useActiveGraph } from '../../context/SandboxContext';
import { usePersistence } from '../../context/PersistenceContext';
import { usePlayback, SPEED_OPTIONS } from '../../context/PlaybackContext';
import { CanvasMode, ViewLens } from '../../types/sandbox';

const modes: { mode: CanvasMode; label: string }[] = [
  { mode: 'select', label: 'Select' },
  { mode: 'edge', label: 'Edge' },
  { mode: 'cut', label: 'Cut' },
];

const lenses: { lens: ViewLens; label: string }[] = [
  { lens: 'clean', label: 'Clean' },
  { lens: 'validation', label: 'Validate' },
];

export default function SandboxToolbar() {
  const { state, setCanvasMode, setViewLens, addGraph } = useSandbox();
  const { graph } = useActiveGraph();
  const { saveGraph } = usePersistence();
  const {
    isGenerated, isPlaying, steps, currentStepIndex, speed,
    generate, play, pause, stepForward, stepBackward, goToStep, reset, setSpeed,
  } = usePlayback();

  const btnStyle = (active: boolean) => ({
    padding: '5px 12px',
    fontSize: 11,
    fontFamily: FONTS.mono,
    fontWeight: 500 as const,
    background: active ? COLORS.blue : COLORS.surface,
    color: active ? '#fff' : COLORS.textSecondary,
    border: `1px solid ${active ? COLORS.blue : COLORS.border}`,
    borderRadius: 4,
    cursor: 'pointer' as const,
    transition: 'all 0.15s',
  });

  const actionBtn = {
    padding: '5px 12px',
    fontSize: 11,
    fontFamily: FONTS.mono,
    fontWeight: 500 as const,
    background: COLORS.surface,
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    cursor: 'pointer' as const,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: COLORS.surface,
      borderRadius: 8,
      border: `1px solid ${COLORS.border}`,
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 2 }}>
        {modes.map(m => (
          <button key={m.mode} style={btnStyle(state.canvasMode === m.mode)}
            onClick={() => setCanvasMode(m.mode)}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: COLORS.border }} />

      {/* View lens */}
      <div style={{ display: 'flex', gap: 2 }}>
        {lenses.map(l => (
          <button key={l.lens} style={btnStyle(state.viewLens === l.lens)}
            onClick={() => setViewLens(l.lens)}>
            {l.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: COLORS.border }} />

      {/* Graph actions */}
      <button style={actionBtn} onClick={() => addGraph()}>
        + Graph
      </button>
      <button style={actionBtn} onClick={() => graph && saveGraph(graph)}>
        Save
      </button>

      <div style={{ width: 1, height: 20, background: COLORS.border }} />

      {/* Algorithm controls */}
      {!isGenerated ? (
        <button style={{
          ...actionBtn,
          background: COLORS.blue,
          color: '#fff',
          borderColor: COLORS.blue,
        }} onClick={() => graph && generate(graph)}
          disabled={!graph || (graph.nodes.length < 2)}>
          Run Algorithm
        </button>
      ) : (
        <>
          <button style={actionBtn} onClick={stepBackward} disabled={currentStepIndex === 0}>
            Prev
          </button>
          <button style={{
            ...actionBtn,
            background: isPlaying ? COLORS.amber : COLORS.blue,
            color: '#fff',
            borderColor: isPlaying ? COLORS.amber : COLORS.blue,
          }} onClick={isPlaying ? pause : play}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button style={actionBtn} onClick={stepForward} disabled={currentStepIndex >= steps.length - 1}>
            Next
          </button>

          <span style={{
            fontSize: 10,
            fontFamily: FONTS.mono,
            color: COLORS.textMuted,
            minWidth: 50,
            textAlign: 'center',
          }}>
            {currentStepIndex + 1} / {steps.length}
          </span>

          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={currentStepIndex}
            onChange={e => goToStep(Number(e.target.value))}
            style={{ width: 80, accentColor: COLORS.blue }}
          />

          <div style={{ display: 'flex', gap: 2 }}>
            {SPEED_OPTIONS.map(s => (
              <button key={s} style={{
                ...btnStyle(speed === s),
                padding: '3px 6px',
                fontSize: 10,
              }} onClick={() => setSpeed(s)}>
                {s}x
              </button>
            ))}
          </div>

          <button style={{
            ...actionBtn,
            color: COLORS.red,
            borderColor: COLORS.red,
          }} onClick={reset}>
            Reset
          </button>
        </>
      )}
    </div>
  );
}
