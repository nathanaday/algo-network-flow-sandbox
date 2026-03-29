import { useRef, useEffect } from 'react';
import { usePlayback } from '../../context/PlaybackContext';
import { FORD_FULKERSON_CODE, PYTHON_KEYWORDS, PYTHON_BUILTINS } from '../../data/fordFulkersonCode';
import { COLORS, FONTS } from '../../styles/theme';

function tokenize(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /(\s+|#.*|""".*"""|"[^"]*"|'[^']*'|\b\w+\b|[^\s\w]+)/g;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    const token = match[0];
    key++;

    if (token.startsWith('#')) {
      tokens.push(<span key={key} style={{ color: '#6A737D' }}>{token}</span>);
    } else if (token.startsWith('"') || token.startsWith("'")) {
      tokens.push(<span key={key} style={{ color: '#98C379' }}>{token}</span>);
    } else if (PYTHON_KEYWORDS.has(token)) {
      tokens.push(<span key={key} style={{ color: '#C678DD' }}>{token}</span>);
    } else if (PYTHON_BUILTINS.has(token)) {
      tokens.push(<span key={key} style={{ color: '#E5C07B' }}>{token}</span>);
    } else if (/^\d+$/.test(token)) {
      tokens.push(<span key={key} style={{ color: '#D19A66' }}>{token}</span>);
    } else if (/^[+\-*/%=<>!&|:,.()\[\]{}]+$/.test(token)) {
      tokens.push(<span key={key} style={{ color: '#ABB2BF' }}>{token}</span>);
    } else {
      tokens.push(<span key={key}>{token}</span>);
    }
  }

  return tokens;
}

export default function CodeDisplay() {
  const { currentStep } = usePlayback();
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLine = currentStep?.codeLine ?? -1;
  const activeLineEnd = currentStep?.codeLineEnd ?? activeLine;

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeLineRef.current;
      const elTop = el.offsetTop;
      const elHeight = el.offsetHeight;
      const containerHeight = container.clientHeight;
      const scrollTarget = elTop - containerHeight / 2 + elHeight / 2;
      container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }
  }, [activeLine]);

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '8px 14px',
        borderBottom: `1px solid ${COLORS.border}`,
        fontSize: '11px',
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: FONTS.sans,
      }}>
        Ford-Fulkerson (Edmonds-Karp)
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '4px 0',
          fontFamily: FONTS.mono,
          fontSize: '12px',
          lineHeight: '20px',
        }}
      >
        {FORD_FULKERSON_CODE.map(({ line, text }) => {
          const isActive = line >= activeLine && line <= activeLineEnd;
          return (
            <div
              key={line}
              ref={line === activeLine ? activeLineRef : undefined}
              style={{
                display: 'flex',
                padding: '0 14px 0 0',
                background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                borderLeft: isActive ? `3px solid ${COLORS.blue}` : '3px solid transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <span style={{
                width: '36px',
                textAlign: 'right',
                paddingRight: '12px',
                color: isActive ? COLORS.blue : COLORS.textMuted,
                userSelect: 'none',
                flexShrink: 0,
              }}>
                {line}
              </span>
              <span style={{ color: COLORS.text, whiteSpace: 'pre' }}>
                {text ? tokenize(text) : '\u00A0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
