import { DragEvent } from 'react';
import { COLORS, FONTS } from '../../styles/theme';

const items = [
  { role: 'source', label: 'Source', color: COLORS.nodeSource },
  { role: 'sink', label: 'Sink', color: COLORS.nodeSink },
  { role: 'regular', label: 'Node', color: COLORS.nodeStroke },
] as const;

export default function NodePalette() {
  const handleDragStart = (e: DragEvent, role: string) => {
    e.dataTransfer.setData('application/node-role', role);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div style={{
      width: 60,
      background: COLORS.paletteBg,
      borderRight: `1px solid ${COLORS.border}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 12,
      gap: 16,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      <span style={{
        fontSize: 9,
        fontFamily: FONTS.mono,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Nodes
      </span>
      {items.map(item => (
        <div
          key={item.role}
          draggable
          onDragStart={e => handleDragStart(e, item.role)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'grab',
            padding: '6px 4px',
            borderRadius: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = COLORS.paletteHover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width={28} height={28} viewBox="0 0 28 28">
            <circle cx={14} cy={14} r={11} fill={COLORS.nodeDefault} stroke={item.color} strokeWidth={2} />
            {item.role === 'source' && (
              <text x={14} y={14} textAnchor="middle" dominantBaseline="central"
                fill={item.color} fontSize={10} fontFamily={FONTS.sans} fontWeight={600}>S</text>
            )}
            {item.role === 'sink' && (
              <text x={14} y={14} textAnchor="middle" dominantBaseline="central"
                fill={item.color} fontSize={10} fontFamily={FONTS.sans} fontWeight={600}>T</text>
            )}
            {item.role === 'regular' && (
              <circle cx={14} cy={14} r={3} fill={COLORS.textMuted} />
            )}
          </svg>
          <span style={{
            fontSize: 9,
            fontFamily: FONTS.mono,
            color: COLORS.textMuted,
          }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
