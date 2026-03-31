import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

interface NoteState {
  notes: Note[];
  loading: boolean;
  fetchNotes: (userId: string) => Promise<void>;
  addNote: (note: Partial<Note>, userId: string) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  clearNotes: (userId: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  loading: false,
  fetchNotes: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error) set({ notes: data, loading: false });
    else set({ loading: false });
  },
  addNote: async (note, userId) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ ...note, user_id: userId })
      .select()
      .single();
    
    if (!error && data) {
      set((state) => ({ notes: [data, ...state.notes] }));
    }
  },
  updateNote: async (id, updates) => {
    const { error } = await supabase.from('notes').update(updates).eq('id', id);
    if (!error) {
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      }));
    }
  },
  deleteNote: async (id) => {
    if (!id) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
    }
  },
  clearNotes: async (userId) => {
    const { error } = await supabase.from('notes').delete().eq('user_id', userId);
    if (!error) {
      set({ notes: [] });
    }
  },
}));
