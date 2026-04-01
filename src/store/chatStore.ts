import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { groqService, type ChatMessage, type DataContext } from '../services/groq';

interface ChatState {
  messages: ChatMessage[];
  isThinking: boolean;
  error: string | null;
  fetchMessages: (userId: string) => Promise<void>;
  sendMessage: (content: string, userId: string, context?: DataContext) => Promise<string | null>;
  subscribeToMessages: (userId: string) => any;
  addMessage: (content: string, role: 'user' | 'assistant', userId: string) => Promise<void>;
  clearHistory: (userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isThinking: false,
  error: null,

  fetchMessages: async (userId) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const loadedMessages: ChatMessage[] = data.map((row: any) => ({
        role: row.role as 'user' | 'assistant',
        content: row.message
      }));
      set({ messages: loadedMessages });
    }
  },

  subscribeToMessages: (userId: string) => {
    return supabase
      .channel('chat-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newMessage: ChatMessage = {
            role: payload.new.role,
            content: payload.new.message
          };
          
          set((state) => {
            // Prevent duplicate messages if already added locally
            const isDuplicate = state.messages.some(m => 
              m.content === newMessage.content && m.role === newMessage.role
            );
            if (isDuplicate) return state;
            return { messages: [...state.messages, newMessage] };
          });
        }
      )
      .subscribe();
  },

  sendMessage: async (content, userId, context) => {
    const userMsg: ChatMessage = { role: 'user', content };
    set((state) => ({ 
      messages: [...state.messages, userMsg],
      isThinking: true,
      error: null 
    }));

    try {
      // 1. Save to Supabase (User)
      await supabase.from('conversations').insert({
        user_id: userId,
        message: content,
        role: 'user'
      });

      // 2. Get AI Response
      const history = get().messages.slice(-10); // Context window 10
      const response = await groqService.chat(history, context);
      
      const assistantMsg: ChatMessage = { role: 'assistant', content: response };
      set((state) => ({ 
        messages: [...state.messages, assistantMsg],
        isThinking: false 
      }));

      // 3. Save to Supabase (Assistant)
      await supabase.from('conversations').insert({
        user_id: userId,
        message: response,
        role: 'assistant'
      });

      return response;
    } catch (err: any) {
      console.error("CHAT_SEND_ERROR:", err);
      set({ isThinking: false, error: err.message });
      return null;
    }
  },

  clearHistory: async (userId) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId);
      
    if (!error) {
      set({ messages: [] });
    }
  },

  addMessage: async (content: string, role: 'user' | 'assistant', userId: string) => {
    const newMessage: ChatMessage = { role, content };
    set((state) => ({ messages: [...state.messages, newMessage] }));
    
    await supabase.from('conversations').insert({
      user_id: userId,
      message: content,
      role: role
    });
  },
}));
