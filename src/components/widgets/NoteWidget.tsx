import React, { useEffect, useState, useRef } from 'react';
import { useNoteStore, type Note } from '../../store/noteStore';
import { HudPanel } from '../ui/HudElements';
import { FileText, Tag, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export const NoteWidget: React.FC<{ userId: string }> = ({ userId }) => {
  const { notes, fetchNotes } = useNoteStore();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const prevNotesLength = useRef(notes.length);

  useEffect(() => {
    fetchNotes(userId);
  }, [userId, fetchNotes]);

  // Auto-open new notes
  useEffect(() => {
    if (notes.length > prevNotesLength.current) {
      setSelectedNote(notes[0]); // Most recent note
    }
    prevNotesLength.current = notes.length;
  }, [notes]);

  return (
    <HudPanel title="DATABASE NOTES" className="h-[200px] flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar p-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-primary/40 text-[10px] space-y-2">
            <FileText className="w-8 h-8 opacity-20" />
            <p>RECORDS ARCHIVED</p>
          </div>
        ) : (
          notes.map((note, idx) => (
            <button 
              key={note.id || `note-${idx}`}
              onClick={() => setSelectedNote(note)}
              className="w-full text-left p-2 border border-primary/20 bg-primary/5 rounded-sm space-y-1 hover:bg-primary/10 transition-colors group"
            >
              <p className="text-[10px] font-bold truncate group-hover:text-primary transition-colors">{note.title}</p>
              <div className="flex items-center justify-between">
                <span className="text-[7px] text-primary/40 uppercase tracking-tighter">
                  {format(new Date(note.created_at), 'MM.dd HH:mm')}
                </span>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag, i) => (
                      <span key={i} className="text-[7px] bg-primary/20 px-1 rounded-full uppercase flex items-center gap-0.5">
                        <Tag className="w-1.5 h-1.5" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* DETAIL VIEW OVERLAY */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 top-0 z-20 bg-black flex flex-col border-t border-primary/30"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10 bg-primary/5">
              <span className="text-[8px] font-bold tracking-widest text-primary/60 flex items-center gap-2">
                <FileText className="w-3 h-3" /> NOTE_DETAIL
              </span>
              <button 
                onClick={() => setSelectedNote(null)}
                className="p-1 hover:bg-primary/20 rounded transition-colors text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-primary tracking-wider uppercase leading-tight">
                  {selectedNote.title}
                </h3>
                <div className="flex items-center gap-3 text-[8px] text-primary/40 tracking-widest uppercase">
                  <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {format(new Date(selectedNote.created_at), 'yyyy.MM.dd | HH:mm:ss')}</span>
                </div>
              </div>

              <div className="border-t border-primary/10 pt-3">
                <p className="text-[10px] leading-relaxed text-primary/80 whitespace-pre-wrap font-mono">
                  {selectedNote.content}
                </p>
              </div>

              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedNote.tags.map((tag, i) => (
                    <span key={i} className="text-[7px] bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-sm uppercase flex items-center gap-1 text-primary/70">
                      <Tag className="w-2 h-2" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </HudPanel>
  );
};
