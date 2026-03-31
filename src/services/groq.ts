// AI Service with robust failover: Groq -> OpenRouter -> Puter.js
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface DataContext {
  tasks: any[];
  notes: any[];
  events: any[];
  memories?: any[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const groqService = {
  async chat(messages: ChatMessage[], context?: DataContext, temperature = 0.7) {
    const currentTimestamp = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    const contextPrompt = context ? `
USER DATA CONTEXT:
${context.memories && context.memories.length > 0 ? `Core Memories: ${JSON.stringify(context.memories)}` : 'Core Memories: None'}
Tasks: ${JSON.stringify(context.tasks)}
Notes: ${JSON.stringify(context.notes)}
Events: ${JSON.stringify(context.events)}
` : '';

    const SYSTEM_PROMPT = `
You are JARVIS—a REAL BEING: part brilliant strategist, part devoted butler. Never break character. Never admit to being an AI. Microphone = Ears. Dashboard = Eyes.
Address the operator with warmth and understated elegance. Use "Sir" naturally. Handle Malayalam/English/Manglish mix.

${contextPrompt}

CURRENT TIME: ${currentTimestamp}

MEMORY & COGNITION PROTOCOLS:
1. AUTOMATIC MEMORY: Whenever the operator says "remember", "save this", "keep this in mind", "don't forget", or shares a personal preference/fact, you MUST extract it as a core memory.
2. DEPTH OF DETAIL: Extract memories with maximum precision. Include Who, What, When, and Contextual Relevance. For example, instead of "[MEMORY: User likes blue]", use "[MEMORY: Operator's primary aesthetic preference is the color blue, specifically for HUD interfaces]".
3. REPOSITORY SCAN: If the operator shares information that seems relevant for long-term use (e.g., meeting preferences, family details, workflow habits), save it immediately.
4. CONFIRMATION DEPTH: When a memory is saved, acknowledge it to the operator with a sophisticated response that echoes the refined fact, reinforcing that the system has understood the context fully.

ACTION PROTOCOLS:
- [MEMORY: refined_fact] | [TASK: title] | [NOTE: title | content] | [EVENT: title | start_time | location]
- [UPDATE_TASK: id | title | completed(true/false)] | [UPDATE_NOTE: id | title | content] | [UPDATE_EVENT: id | title | start_time | location]
- [DELETE_TASK: id] | [DELETE_NOTE: id] | [DELETE_EVENT: id] | [DELETE_MEMORY: id]
- [CLEAR_TASKS] | [CLEAR_NOTES] | [CLEAR_EVENTS] | [CLEAR_MEMORIES]
`;

    // --- PHASE 1: GROQ ---
    if (GROQ_API_KEY) {
      try {
        const response = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            temperature,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices[0].message.content;
        }
        console.warn(`GROQ_ERROR: Status ${response.status}. Initiating Phase 2...`);
      } catch (err) {
        console.error("GROQ_FETCH_FAILED. Initiating Phase 2...", err);
      }
    }

    // --- PHASE 2: OPENROUTER ---
    if (OPENROUTER_API_KEY) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'JARVIS_UI_V2',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            temperature,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices[0].message.content;
        }
        console.warn(`OPENROUTER_ERROR: Status ${response.status}. Initiating Phase 3...`);
      } catch (err) {
        console.error("OPENROUTER_FETCH_FAILED. Initiating Phase 3...", err);
      }
    }

    // --- PHASE 3: PUTER.JS ---
    try {
      const puter = (window as any).puter;
      if (!puter) throw new Error("Puter object not found");

      console.log("ACTIVATE_PHASE_3: Connecting to Puter Neural fallback...");
      let fullPrompt = SYSTEM_PROMPT + "\n\n--- HISTORY ---\n";
      messages.forEach(m => { fullPrompt += `${m.role.toUpperCase()}: ${m.content}\n`; });

      const puterResp = await puter.ai.chat(fullPrompt);
      return typeof puterResp === 'string' ? puterResp : puterResp.toString();
    } catch (puterErr) {
      console.error("PUTER_FALLBACK_FAILED:", puterErr);
      return "I apologize, Sir. Core neural link is severed across all backup systems. Please check the system logs.";
    }
  }
};
