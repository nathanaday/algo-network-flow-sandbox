import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Graph } from '../types/graph';
import { SavedGraph } from '../types/sandbox';
import {
  loadAllSaved,
  saveGraphToStorage,
  deleteSavedFromStorage,
  generateThumbnail,
  exportSavedGraphs,
  importSavedGraphs,
} from '../services/persistence';

interface PersistenceContextValue {
  savedGraphs: SavedGraph[];
  saveGraph: (graph: Graph) => void;
  deleteSaved: (id: string) => void;
  renameSaved: (id: string, name: string) => void;
  exportAll: () => void;
  importFromFile: (file: File) => Promise<void>;
}

const PersistenceCtx = createContext<PersistenceContextValue | null>(null);

export function PersistenceProvider({ children }: { children: ReactNode }) {
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);

  useEffect(() => {
    setSavedGraphs(loadAllSaved());
  }, []);

  const saveGraph = useCallback((graph: Graph) => {
    const now = new Date().toISOString();
    const existing = savedGraphs.find(s => s.id === graph.id);
    const saved: SavedGraph = {
      id: graph.id,
      name: graph.name,
      graph,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      thumbnailDataUrl: generateThumbnail(graph),
    };
    saveGraphToStorage(saved);
    setSavedGraphs(loadAllSaved());
  }, [savedGraphs]);

  const deleteSaved = useCallback((id: string) => {
    deleteSavedFromStorage(id);
    setSavedGraphs(loadAllSaved());
  }, []);

  const renameSaved = useCallback((id: string, name: string) => {
    const all = loadAllSaved();
    const item = all.find(s => s.id === id);
    if (item) {
      item.name = name;
      item.graph.name = name;
      item.updatedAt = new Date().toISOString();
      saveGraphToStorage(item);
      setSavedGraphs(loadAllSaved());
    }
  }, []);

  const exportAll = useCallback(() => {
    exportSavedGraphs(savedGraphs);
  }, [savedGraphs]);

  const importFromFile = useCallback(async (file: File) => {
    const imported = await importSavedGraphs(file);
    for (const sg of imported) {
      saveGraphToStorage(sg);
    }
    setSavedGraphs(loadAllSaved());
  }, []);

  return (
    <PersistenceCtx.Provider value={{ savedGraphs, saveGraph, deleteSaved, renameSaved, exportAll, importFromFile }}>
      {children}
    </PersistenceCtx.Provider>
  );
}

export function usePersistence() {
  const ctx = useContext(PersistenceCtx);
  if (!ctx) throw new Error('usePersistence must be used within PersistenceProvider');
  return ctx;
}
