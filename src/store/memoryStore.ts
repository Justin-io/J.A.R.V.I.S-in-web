import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Memory {
  id: string;
  user_id: string;
  fact: string;
  created_at: string;
}

interface MemoryState {
  memories: Memory[];
  loading: boolean;
  fetchMemories: (userId: string) => Promise<void>;
  addMemory: (fact: string, userId: string) => Promise<void>;
  updateMemory: (id: string, fact: string) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  clearMemories: (userId: string) => Promise<void>;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [],
  loading: false,

  fetchMemories: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      set({ memories: data, loading: false });
    } else {
      if (error) console.error("SUPABASE_MEMORY_FETCH_ERROR:", error);
      set({ loading: false });
    }
  },

  addMemory: async (fact, userId) => {
    // Basic duplication check before hitting DB heavily
    const { data: existing } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', userId)
      .ilike('fact', fact)
      .maybeSingle();

    if (existing) return;

    const { data, error } = await supabase
      .from('memories')
      .insert({ fact, user_id: userId })
      .select()
      .single();
      
    if (!error && data) {
      set((state) => ({ memories: [data, ...state.memories] }));
    } else if (error) {
       console.error("SUPABASE_MEMORY_INSERT_ERROR:", error);
    }
  },

  updateMemory: async (id, fact) => {
    const { error } = await supabase.from('memories').update({ fact }).eq('id', id);
    if (!error) {
      set((state) => ({
        memories: state.memories.map((m) => m.id === id ? { ...m, fact } : m)
      }));
    }
  },

  removeMemory: async (id) => {
    if (!id) return;
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (!error) {
      set((state) => ({ 
        memories: state.memories.filter((m) => m.id !== id) 
      }));
    }
  },

  clearMemories: async (userId) => {
    const { error } = await supabase.from('memories').delete().eq('user_id', userId);
    if (!error) {
      set({ memories: [] });
    }
  }
}));
