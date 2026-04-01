import { useState, useRef } from 'react';
import { COLORS, FONTS } from '../../styles/theme';
import { usePersistence } from '../../context/PersistenceContext';
import { useSandbox } from '../../context/SandboxContext';

export default function SavedGraphsBrowser() {
  const [expanded, setExpanded] = useState(false);
  const { savedGraphs, deleteSaved, exportAll, importFromFile } = usePersistence();
  const { loadGraph } = useSandbox();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (savedGraphs.length === 0 && !expanded) return null;

  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: 8,
      border: `1px solid ${COLORS.border}`,
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
      }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: COLORS.textSecondary,
            fontFamily: FONTS.mono,
            fontSize: 11,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span>Saved Graphs ({savedGraphs.length})</span>
          <span style={{ fontSize: 10 }}>{expanded ? 'v' : '>'}</span>
        </button>

        <div style={{ display: 'flex', gap: 4 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                importFromFile(file);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textSecondary,
              fontFamily: FONTS.mono,
              fontSize: 10,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            Import
          </button>
          <button
            onClick={exportAll}
            disabled={savedGraphs.length === 0}
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: savedGraphs.length === 0 ? COLORS.textMuted : COLORS.textSecondary,
              fontFamily: FONTS.mono,
              fontSize: 10,
              cursor: savedGraphs.length === 0 ? 'default' : 'pointer',
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            Export
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{
          display: 'flex',
          gap: 10,
          padding: '8px 12px 12px',
          overflowX: 'auto',
          minHeight: 0,
        }}>
          {savedGraphs.length === 0 ? (
            <span style={{
              fontSize: 11,
              color: COLORS.textMuted,
              fontFamily: FONTS.mono,
              padding: '20px 0',
            }}>
              No saved graphs yet. Use Save to store a graph.
            </span>
          ) : (
            savedGraphs.map(sg => (
              <div key={sg.id} style={{
                flexShrink: 0,
                width: 160,
                background: COLORS.bg,
                borderRadius: 6,
                border: `1px solid ${COLORS.border}`,
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
                onClick={() => loadGraph(sg.graph)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = COLORS.blue)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = COLORS.border as string)}
              >
                {sg.thumbnailDataUrl && (
                  <img
                    src={sg.thumbnailDataUrl}
                    alt={sg.name}
                    style={{ width: 160, height: 100, display: 'block' }}
                  />
                )}
                <div style={{ padding: '6px 8px' }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: COLORS.text,
                    fontFamily: FONTS.sans,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {sg.name}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 2,
                  }}>
                    <span style={{
                      fontSize: 9,
                      color: COLORS.textMuted,
                      fontFamily: FONTS.mono,
                    }}>
                      {new Date(sg.updatedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSaved(sg.id); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.textMuted,
                        fontSize: 10,
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      x
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
