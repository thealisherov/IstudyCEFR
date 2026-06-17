import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotesContext = createContext(null);

export function NotesProvider({ storageId = 'global', children }) {
  const storageKey = `notes_${storageId}`;
  const highlightPrefix = `highlights_${storageId}_`;

  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(notes)); } catch { /* ignore */ }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('NOTES_UPDATED', { detail: { notes } }));
    }
  }, [notes, storageKey]);

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('TOGGLE_NOTES_SIDEBAR', handleToggle);
    return () => window.removeEventListener('TOGGLE_NOTES_SIDEBAR', handleToggle);
  }, []);

  const addNote = useCallback((noteData) => {
    const newNote = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      note: '',
      createdAt: new Date().toISOString(),
      ...noteData,
    };
    setNotes(prev => [...prev, newNote]);
    return newNote.id;
  }, []);

  const updateNoteText = useCallback((id, noteText) => {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, note: noteText } : n)));
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotes = useCallback(() => setNotes([]), []);

  const clearHighlights = useCallback(() => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(highlightPrefix)) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }, [highlightPrefix]);

  const value = {
    notes, isSidebarOpen, setIsSidebarOpen,
    addNote, updateNoteText, deleteNote, clearNotes, clearHighlights,
    highlightPrefix,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) {
    throw new Error('useNotes() faqat <NotesProvider> ichida ishlaydi');
  }
  return ctx;
}
