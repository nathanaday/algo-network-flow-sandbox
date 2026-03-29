import { COLORS, FONTS } from '../styles/theme';
import { useActiveGraph } from '../context/SandboxContext';
import NodePalette from './palette/NodePalette';
import SandboxCanvas from './canvas/SandboxCanvas';
import TabularPanel from './table/TabularPanel';
import SandboxToolbar from './toolbar/SandboxToolbar';
import SavedGraphsBrowser from './saved/SavedGraphsBrowser';

export default function Layout() {
  const { graph } = useActiveGraph();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      padding: '8px',
      gap: '8px',
      fontFamily: FONTS.sans,
      color: COLORS.text,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '10px',
        padding: '0 4px',
        flexShrink: 0,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 700,
          color: COLORS.text,
          letterSpacing: '-0.02em',
        }}>
          Network Flow Sandbox
        </h1>
        {graph && (
          <span style={{
            fontSize: '12px',
            color: COLORS.textMuted,
            fontFamily: FONTS.mono,
          }}>
            {graph.name}
          </span>
        )}
      </div>

      {/* Main content: palette + canvas + tabular panel */}
      <div style={{
        display: 'flex',
        flex: 1,
        gap: '8px',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <NodePalette />
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <SandboxCanvas />
        </div>
        <TabularPanel />
      </div>

      {/* Toolbar */}
      <SandboxToolbar />

      {/* Saved graphs browser */}
      <SavedGraphsBrowser />
    </div>
  );
}
