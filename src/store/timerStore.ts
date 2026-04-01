import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Timer {
  id: string;
  user_id: string;
  title: string;
  duration: number; // original duration in seconds
  endTime: string;  // ISO string
  isAlarm: boolean;
  fired: boolean;
}

interface TimerState {
  timers: Timer[];
  loading: boolean;
  fetchTimers: (userId: string) => Promise<void>;
  addTimer: (title: string, duration: number, userId: string) => Promise<void>;
  addAlarm: (title: string, fireTime: string, userId: string) => Promise<void>;
  removeTimer: (id: string) => Promise<void>;
  markFired: (id: string) => Promise<void>;
}

export const useTimerStore = create<TimerState>((set) => ({
  timers: [],
  loading: false,

  fetchTimers: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('timers')
      .select('*')
      .eq('user_id', userId)
      .eq('fired', false);
    
    if (!error && data) {
      const mapped = data.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        title: t.title,
        duration: t.duration,
        endTime: t.end_time,
        isAlarm: t.is_alarm,
        fired: t.fired,
      }));
      set({ timers: mapped, loading: false });
    } else {
      set({ loading: false });
    }
  },

  addTimer: async (title, duration, userId) => {
    const tempId = Math.random().toString(36).substring(7);
    const endTime = new Date(Date.now() + duration * 1000).toISOString();
    
    // Optimistic Update
    const localTimer: Timer = {
      id: tempId,
      user_id: userId,
      title,
      duration,
      endTime,
      isAlarm: false,
      fired: false,
    };
    set((state) => ({ timers: [...state.timers, localTimer] }));

    const { data, error } = await supabase
      .from('timers')
      .insert({
        title,
        duration,
        end_time: endTime,
        user_id: userId,
        is_alarm: false,
        fired: false
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE_TIMER_SYNC_ERROR: Table 'timers' might be missing. Running in local-only mode.", error);
    } else if (data) {
      // Replace temp local timer with DB version to get the real ID
      set((state) => ({
        timers: state.timers.map(t => t.id === tempId ? {
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          duration: data.duration,
          endTime: data.end_time,
          isAlarm: data.is_alarm,
          fired: data.fired,
        } : t)
      }));
    }
  },

  addAlarm: async (title, fireTime, userId) => {
    const tempId = Math.random().toString(36).substring(7);
    
    // Optimistic Update
    const localAlarm: Timer = {
      id: tempId,
      user_id: userId,
      title,
      duration: 0,
      endTime: fireTime,
      isAlarm: true,
      fired: false,
    };
    set((state) => ({ timers: [...state.timers, localAlarm] }));

    const { data, error } = await supabase
      .from('timers')
      .insert({
        title,
        duration: 0,
        end_time: fireTime,
        user_id: userId,
        is_alarm: true,
        fired: false
      })
      .select()
      .single();

    if (error) {
       console.error("SUPABASE_ALARM_SYNC_ERROR: Table 'timers' might be missing. Running in local-only mode.", error);
    } else if (data) {
      set((state) => ({
        timers: state.timers.map(t => t.id === tempId ? {
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          duration: data.duration,
          endTime: data.end_time,
          isAlarm: data.is_alarm,
          fired: data.fired,
        } : t)
      }));
    }
  },

  removeTimer: async (id) => {
    // Optimistic
    set((state) => ({ timers: state.timers.filter((t) => t.id !== id) }));
    
    const { error } = await supabase.from('timers').delete().eq('id', id);
    if (error) {
      console.warn("SUPABASE_DELETE_ERROR: Falling back to local deletion.", error);
    }
  },

  markFired: async (id) => {
    // Optimistic
    set((state) => ({
      timers: state.timers.map((t) => (t.id === id ? { ...t, fired: true } : t)),
    }));

    const { error } = await supabase.from('timers').update({ fired: true }).eq('id', id);
    if (error) {
      console.warn("SUPABASE_UPDATE_ERROR: Falling back to local state.", error);
    }
  },
}));
