import React, { useRef, useEffect } from 'react';
import { useNotes } from './NotesProvider';

export default function NotesSidebar() {
  const { notes, isSidebarOpen, setIsSidebarOpen, updateNoteText, deleteNote } = useNotes();
  const latestRef = useRef(null);

  useEffect(() => {
    if (isSidebarOpen && latestRef.current) {
      const timer = setTimeout(() => {
        if (latestRef.current) latestRef.current.focus({ preventScroll: true });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [notes.length, isSidebarOpen]);

  if (!isSidebarOpen) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 109 }}
        onClick={() => setIsSidebarOpen(false)}
      />
      <div
        style={{
          width: 360, height: '100%', position: 'fixed', right: 0, top: 0, zIndex: 110,
          display: 'flex', flexDirection: 'column', background: '#f9fafb',
          borderLeft: '1px solid #e5e7eb', boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: '#1f2937' }}>Eslatmalar</span>
            {notes.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#dbeafe', color: '#3b82f6' }}>
                {notes.length}
              </span>
            )}
          </div>
          <button onClick={() => setIsSidebarOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.6, padding: '60px 20px' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#6b7280' }}>Hali eslatma yo'q</p>
              <p style={{ fontSize: 12, marginTop: 4, color: '#9ca3af' }}>
                Matnni tanlab "Note" tugmasini bosib yangi eslatma yarating.
              </p>
            </div>
          ) : (
            notes.map((n, i) => {
              const isLast = i === notes.length - 1;
              return (
                <div key={n.id} style={{ borderRadius: 12, border: '1px solid #bfdbfe', background: '#eff6ff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '12px 14px 6px', display: 'flex', gap: 8, borderBottom: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: 18, color: '#3b82f6', opacity: 0.5 }}>"</span>
                    <span style={{ fontSize: 13, fontStyle: 'italic', color: '#374151', lineHeight: 1.5 }} title={n.text}>
                      {n.text}
                    </span>
                  </div>
                  <div style={{ padding: '8px 12px' }}>
                    <textarea
                      ref={isLast ? latestRef : undefined}
                      style={{ width: '100%', fontSize: 13, padding: 10, border: '1px solid #bfdbfe', borderRadius: 8, resize: 'none', background: '#fff', color: '#111' }}
                      rows={2}
                      placeholder="Eslatmangizni yozing..."
                      value={n.note || ''}
                      onChange={(e) => updateNoteText(n.id, e.target.value)}
                    />
                  </div>
                  <div style={{ padding: '0 12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, opacity: 0.4 }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => deleteNote(n.id)}
                      style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      O'chirish
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
