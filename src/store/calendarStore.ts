import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  is_all_day: boolean;
}

interface CalendarState {
  events: Event[];
  loading: boolean;
  fetchEvents: (userId: string) => Promise<void>;
  addEvent: (event: Partial<Event>, userId: string) => Promise<void>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  clearEvents: (userId: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  loading: false,
  fetchEvents: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });
    
    if (!error) set({ events: data, loading: false });
    else set({ loading: false });
  },
  addEvent: async (event, userId) => {
    const { data, error } = await supabase
      .from('events')
      .insert({ ...event, user_id: userId })
      .select()
      .single();
    
    if (!error && data) {
      set((state) => ({ events: [...state.events, data] }));
    }
  },
  updateEvent: async (id, updates) => {
    const { error } = await supabase.from('events').update(updates).eq('id', id);
    if (!error) {
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
    }
  },
  deleteEvent: async (id) => {
    if (!id) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
    }
  },
  clearEvents: async (userId) => {
    const { error } = await supabase.from('events').delete().eq('user_id', userId);
    if (!error) {
      set({ events: [] });
    }
  },
}));
