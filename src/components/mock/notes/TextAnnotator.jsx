import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotes } from './NotesProvider';

/* CSS Custom Highlight API qo'llab-quvvatlanishini tekshirish */
const CSS_HL_SUPPORTED =
  typeof window !== 'undefined' &&
  typeof CSS !== 'undefined' &&
  !!CSS.highlights &&
  typeof Highlight !== 'undefined';

/* ::highlight() CSS qoidasini bir marta <head>ga qo'shish */
function ensureHighlightStyle(hlName, bg, fg, extra = '') {
  if (typeof document === 'undefined') return;
  const id = `hl-style-${hlName}`;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `::highlight(${hlName}) { background-color: ${bg} !important; color: ${fg} !important; ${extra} }`;
  document.head.appendChild(style);
}

/* Interaktiv elementlar ichida belgilash yaratilmasligi uchun */
function isSafeToMark(range) {
  if (!range) return false;
  const ancestor = range.commonAncestorContainer;
  const el = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor;
  if (!el) return false;
  try {
    const interactives = el.querySelectorAll('input,textarea,select,button');
    for (const inp of interactives) {
      if (range.intersectsNode(inp)) return false;
    }
  } catch { /* ignore */ }
  return true;
}

/* Tanlangan matnning belgi-ofsetini hisoblash */
function getSelectionOffsets(container, range) {
  const pre = range.cloneRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const text = range.toString();
  return { start, end: start + text.length, text };
}

/* Saqlangan ofsetlardan qaytadan Range yasash */
function restoreRange(container, start, end) {
  let idx = 0;
  const range = document.createRange();
  let foundStart = false, stop = false;
  (function walk(node) {
    if (stop) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const next = idx + node.length;
      if (!foundStart && start >= idx && start <= next) {
        range.setStart(node, start - idx);
        foundStart = true;
      }
      if (foundStart && end >= idx && end <= next) {
        range.setEnd(node, end - idx);
        stop = true;
      }
      idx = next;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
    }
  })(container);
  return (foundStart && stop) ? range : null;
}

/* Sichqoncha bosilgan nuqtadan matn ofsetini topish (note bosilganini aniqlash uchun) */
function getCaretOffset(container, clientX, clientY) {
  try {
    let range;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(clientX, clientY);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (!pos) return -1;
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.setEnd(pos.offsetNode, pos.offset);
    }
    if (!range || !container.contains(range.startContainer)) return -1;
    return getSelectionOffsets(container, range).start;
  } catch { return -1; }
}

/* Tanlov ustida chiqadigan toolbar */
function SelectionToolbar({ position, onAddNote, onHighlight, onEraser }) {
  if (!position) return null;
  return (
    <div
      style={{
        position: 'fixed', zIndex: 200, left: position.left, top: position.top,
        transform: 'translate(-50%, -8px)', display: 'flex', alignItems: 'center',
        overflow: 'hidden', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        border: '1px solid #e2e2e2', background: '#ffffff', fontFamily: 'sans-serif',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAddNote(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#1a1a1a', borderRight: '1px solid #e2e2e2', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8.5L15.5 3z"/>
          <polyline points="14,3 14,8 21,8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
        Note
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onHighlight(); }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', borderRight: '1px solid #e2e2e2', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          <path d="M3 21h18" strokeLinecap="round"/>
        </svg>
        <div style={{ height: 4, width: '100%', background: '#ddff00', marginTop: 2, borderRadius: 2 }}/>
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onEraser(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  );
}

/* ================= ASOSIY KOMPONENT — TextAnnotator ================= */
export default function TextAnnotator({
  children,
  className = '',
  enabled = true,
  containerId = 'main', // bir sahifada bir nechta blok bo'lsa, har biriga noyob id bering
}) {
  const [toolbarPos, setToolbarPos] = useState(null);
  const [rangeOffsets, setRangeOffsets] = useState(null);
  const contentRef = useRef(null);

  const notesCtx = useNotes();
  const notes = notesCtx.notes || [];
  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; });

  const { addNote, setIsSidebarOpen, highlightPrefix } = notesCtx;
  const hlStorageKey = `${highlightPrefix}${containerId}`;

  const hlName = `hl-${containerId}`;
  const noteHlName = `note-${containerId}`;

  const loadHighlights = useCallback(() => {
    try {
      const s = localStorage.getItem(hlStorageKey);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  }, [hlStorageKey]);

  const saveHighlights = useCallback((hl) => {
    try { localStorage.setItem(hlStorageKey, JSON.stringify(hl)); } catch { /* ignore */ }
  }, [hlStorageKey]);

  /* Sariq highlightlarni chizish */
  const applyHighlights = useCallback(() => {
    const el = contentRef.current;
    if (!el || !el.textContent.trim()) return;

    if (CSS_HL_SUPPORTED) {
      CSS.highlights.delete(hlName);
      const highlights = loadHighlights();
      if (!highlights.length) return;
      ensureHighlightStyle(hlName, '#ffff00', '#000');
      const ranges = highlights
        .map(hl => { try { return restoreRange(el, hl.start, hl.end); } catch { return null; } })
        .filter(Boolean);
      if (ranges.length) CSS.highlights.set(hlName, new Highlight(...ranges));
      return;
    }

    el.querySelectorAll('mark.hl-mark').forEach(m => {
      const p = m.parentNode; if (!p) return;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    });
    const highlights = loadHighlights();
    if (!highlights.length) return;
    [...highlights].sort((a, b) => b.start - a.start).forEach(hl => {
      try {
        const range = restoreRange(el, hl.start, hl.end);
        if (!range || !isSafeToMark(range)) return;
        const mark = document.createElement('mark');
        mark.className = 'hl-mark';
        mark.style.cssText = 'background-color:#ffff00;color:#000;';
        try { range.surroundContents(mark); }
        catch { const f = range.extractContents(); mark.appendChild(f); range.insertNode(mark); }
      } catch { /* ignore */ }
    });
  }, [loadHighlights, hlName]);

  /* Eslatma (note) belgilarini chizish (ko'k tagiga chizilgan) */
  const applyNoteMarks = useCallback(() => {
    const el = contentRef.current;
    if (!el || !el.textContent.trim()) return;

    const currentNotes = notesRef.current || [];
    const relevant = currentNotes.filter(n => n.containerId === containerId);

    if (CSS_HL_SUPPORTED) {
      CSS.highlights.delete(noteHlName);
      if (!relevant.length) return;
      ensureHighlightStyle(
        noteHlName, '#dbeafe', 'inherit',
        'text-decoration:underline;text-decoration-color:#3b82f6;text-decoration-thickness:2px;'
      );
      const ranges = relevant
        .map(n => { try { return restoreRange(el, n.start, n.end); } catch { return null; } })
        .filter(Boolean);
      if (ranges.length) CSS.highlights.set(noteHlName, new Highlight(...ranges));
      return;
    }

    el.querySelectorAll('mark[data-note-id]').forEach(m => {
      const p = m.parentNode; if (!p) return;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    });
    [...relevant].sort((a, b) => b.start - a.start).forEach(note => {
      try {
        const range = restoreRange(el, note.start, note.end);
        if (!range || !isSafeToMark(range)) return;
        const mark = document.createElement('mark');
        mark.setAttribute('data-note-id', note.id);
        mark.style.cssText = 'background:#eff6ff;border-bottom:2px solid #3b82f6;padding:0 1px;cursor:pointer;';
        mark.addEventListener('click', () => { if (window.getSelection()?.isCollapsed) setIsSidebarOpen(true); });
        try { range.surroundContents(mark); }
        catch { const f = range.extractContents(); mark.appendChild(f); range.insertNode(mark); }
      } catch { /* ignore */ }
    });
  }, [containerId, setIsSidebarOpen, noteHlName]);

  const applyAll = useCallback(() => {
    applyNoteMarks();
    applyHighlights();
  }, [applyNoteMarks, applyHighlights]);

  // Har render so'ngida qayta chizish
  useEffect(() => {
    const timer = requestAnimationFrame(() => applyAll());
    return () => cancelAnimationFrame(timer);
  });

  // Boshqa joyda eslatma o'zgarganda ham qayta chizish
  useEffect(() => {
    const handler = () => requestAnimationFrame(() => applyAll());
    window.addEventListener('NOTES_UPDATED', handler);
    return () => window.removeEventListener('NOTES_UPDATED', handler);
  }, [applyAll]);

  /* Note belgisiga bosilganini aniqlash (CSS Highlight rejimida) */
  const handleClick = useCallback((e) => {
    if (window.getSelection()?.toString().trim().length > 0) return;
    const el = contentRef.current;
    if (!el || !notesRef.current?.length) return;
    const offset = getCaretOffset(el, e.clientX, e.clientY);
    if (offset < 0) return;
    const hasNote = notesRef.current.some(
      n => n.containerId === containerId && n.start <= offset && n.end >= offset
    );
    if (hasNote) setIsSidebarOpen(true);
  }, [containerId, setIsSidebarOpen]);

  /* Matn tanlanganda toolbar pozitsiyasini hisoblash */
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setToolbarPos(null); setRangeOffsets(null); return;
    }
    if (sel.anchorNode) {
      const el = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(el?.tagName)) return;
    }
    const range = sel.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      setToolbarPos(null); setRangeOffsets(null); return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    setToolbarPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    setRangeOffsets(getSelectionOffsets(contentRef.current, range));
  }, []);

  /* Eslatma qo'shish */
  const handleAddNote = useCallback(() => {
    if (!rangeOffsets?.text.trim()) return;
    addNote({ containerId, start: rangeOffsets.start, end: rangeOffsets.end, text: rangeOffsets.text, note: '' });
    window.getSelection()?.removeAllRanges();
    setToolbarPos(null); setRangeOffsets(null);
    setIsSidebarOpen(true);
  }, [rangeOffsets, addNote, containerId, setIsSidebarOpen]);

  /* Highlight qo'shish */
  const handleHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const el = contentRef.current;
    if (!el?.contains(range.commonAncestorContainer)) return;
    const offsets = getSelectionOffsets(el, range);
    if (!offsets.text.trim()) { selection.removeAllRanges(); setToolbarPos(null); return; }
    const highlights = loadHighlights();
    if (!highlights.some(h => h.start < offsets.end && h.end > offsets.start)) {
      highlights.push({ id: 'hl_' + Date.now() + Math.random().toString(36).slice(2, 7), ...offsets });
      saveHighlights(highlights);
    }
    selection.removeAllRanges(); setToolbarPos(null); setRangeOffsets(null);
    requestAnimationFrame(() => applyHighlights());
  }, [loadHighlights, saveHighlights, applyHighlights]);

  /* Highlightni o'chirish (faqat sariq belgini, eslatmani emas) */
  const handleEraser = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const el = contentRef.current;
    if (!el) return;
    const offsets = getSelectionOffsets(el, range);
    saveHighlights(loadHighlights().filter(h => !(h.start < offsets.end && h.end > offsets.start)));
    selection.removeAllRanges(); setToolbarPos(null);
    requestAnimationFrame(() => applyHighlights());
  }, [loadHighlights, saveHighlights, applyHighlights]);

  /* Toolbar yopish (scroll yoki tashqariga bosilganda) */
  useEffect(() => {
    const h = () => { if (toolbarPos) setToolbarPos(null); };
    window.addEventListener('scroll', h, true);
    return () => window.removeEventListener('scroll', h, true);
  }, [toolbarPos]);

  useEffect(() => {
    const h = (e) => {
      if (toolbarPos && contentRef.current && !contentRef.current.contains(e.target)) setToolbarPos(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [toolbarPos]);

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <>
      <SelectionToolbar position={toolbarPos} onAddNote={handleAddNote} onHighlight={handleHighlight} onEraser={handleEraser} />
      <div
        ref={contentRef}
        className={className}
        style={{ userSelect: 'text' }}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onClick={handleClick}
      >
        {children}
      </div>
    </>
  );
}
