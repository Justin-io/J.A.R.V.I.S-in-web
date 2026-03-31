import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
}

interface TodoState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (task: Partial<Task>, userId: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearTasks: (userId: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set) => ({
  tasks: [],
  loading: false,
  fetchTasks: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error) set({ tasks: data, loading: false });
    else set({ loading: false });
  },
  addTask: async (task, userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: userId })
      .select()
      .single();
    
    if (!error && data) {
      set((state) => ({ tasks: [data, ...state.tasks] }));
    }
  },
  updateTask: async (id, updates) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (!error) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    }
  },
  deleteTask: async (id) => {
    if (!id) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    }
  },
  clearTasks: async (userId) => {
    const { error } = await supabase.from('tasks').delete().eq('user_id', userId);
    if (!error) {
      set({ tasks: [] });
    }
  },
}));
