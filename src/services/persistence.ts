import { Graph } from '../types/graph';
import { SavedGraph } from '../types/sandbox';
import { COLORS } from '../styles/theme';

const STORAGE_KEY = 'network-flow-sandbox-saved-graphs';

export function loadAllSaved(): SavedGraph[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedGraph[];
  } catch {
    return [];
  }
}

export function saveGraphToStorage(saved: SavedGraph): void {
  const all = loadAllSaved();
  const idx = all.findIndex(s => s.id === saved.id);
  if (idx >= 0) {
    all[idx] = saved;
  } else {
    all.push(saved);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteSavedFromStorage(id: string): void {
  const all = loadAllSaved().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function exportSavedGraphs(graphs: SavedGraph[]): void {
  const json = JSON.stringify(graphs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'saved-graphs.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importSavedGraphs(file: File): Promise<SavedGraph[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed)) {
          reject(new Error('Expected an array of saved graphs'));
          return;
        }
        resolve(parsed as SavedGraph[]);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function generateThumbnail(graph: Graph, width = 160, height = 100): string {
  if (graph.nodes.length === 0) {
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${COLORS.surface}"/></svg>`)}`;
  }

  const xs = graph.nodes.map(n => n.x ?? 0);
  const ys = graph.nodes.map(n => n.y ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const pad = 16;
  const scaleX = (width - pad * 2) / rangeX;
  const scaleY = (height - pad * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY);

  const tx = (n: { x?: number; y?: number }) => pad + ((n.x ?? 0) - minX) * scale;
  const ty = (n: { x?: number; y?: number }) => pad + ((n.y ?? 0) - minY) * scale;

  const nodeMap = Object.fromEntries(graph.nodes.map(n => [n.id, n]));

  const edges = graph.edges.map(e => {
    const s = nodeMap[e.source];
    const t = nodeMap[e.target];
    if (!s || !t) return '';
    return `<line x1="${tx(s)}" y1="${ty(s)}" x2="${tx(t)}" y2="${ty(t)}" stroke="${COLORS.edgeDefault}" stroke-width="1" opacity="0.6"/>`;
  }).join('');

  const nodes = graph.nodes.map(n => {
    const fill = n.id === graph.sourceId ? COLORS.nodeSource
      : n.id === graph.sinkId ? COLORS.nodeSink
      : COLORS.nodeDefault;
    const stroke = n.id === graph.sourceId ? COLORS.nodeSource
      : n.id === graph.sinkId ? COLORS.nodeSink
      : COLORS.nodeStroke;
    return `<circle cx="${tx(n)}" cy="${ty(n)}" r="5" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${COLORS.surface}" rx="4"/>
    ${edges}${nodes}
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
