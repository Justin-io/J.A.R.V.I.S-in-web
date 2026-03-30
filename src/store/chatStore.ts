import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { groqService, type ChatMessage, type DataContext } from '../services/groq';
import { supabase } from '../services/supabase';

interface ChatState {
  messages: ChatMessage[];
  isThinking: boolean;
  error: string | null;
  sendMessage: (content: string, userId: string, context?: DataContext) => Promise<string | null>;
  clearHistory: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isThinking: false,
      error: null,
      sendMessage: async (content, userId, context) => {
        const userMsg: ChatMessage = { role: 'user', content };
        set((state) => ({ 
          messages: [...state.messages, userMsg],
          isThinking: true,
          error: null 
        }));

        try {
          // 1. Save to Supabase (Sync)
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
          set({ isThinking: false, error: err.message });
          return null;
        }
      },
      clearHistory: () => set({ messages: [] }),
    }),
    {
      name: 'jarvis-chat-storage',
    }
  )
);
