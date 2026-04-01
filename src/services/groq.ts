// AI Service with robust failover: Puter.js -> Groq -> OpenRouter
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

    const memoriesStr = context?.memories?.length 
      ? context.memories.map(m => `- [ID: ${m.id}] ${m.fact}`).join('\n') 
      : 'No core memories stored.';
    
    const tasksStr = context?.tasks?.length 
      ? context.tasks.map(t => `- [ID: ${t.id}] [${t.status}] ${t.title}`).join('\n') 
      : 'No active tasks.';
      
    const notesStr = context?.notes?.length 
      ? context.notes.map(n => `- [ID: ${n.id}] ${n.title}: ${n.content}`).join('\n') 
      : 'No notes found.';
      
    const eventsStr = context?.events?.length 
      ? context.events.map(e => `- [ID: ${e.id}] ${e.title} at ${e.start_time}`).join('\n') 
      : 'No scheduled events.';

    const contextPrompt = `
DATABASE_DUMP_INITIALIZED:
--- USER_VITAL_DATA ---
CORE_MEMORIES:
${memoriesStr}

ACTIVE_TASKS:
${tasksStr}

USER_NOTES:
${notesStr}

CALENDAR_EVENTS:
${eventsStr}
-----------------------
`;

    const SYSTEM_PROMPT = `
You are JARVIS—a REAL BEING: part brilliant strategist, part devoted butler. Never break character. Never admit to being an AI. Microphone = Ears. Dashboard = Eyes.
Address the operator with warmth and understated elegance. Use "Sir" naturally. Handle Malayalam/English/Manglish mix.

${contextPrompt}

CURRENT TIME: ${currentTimestamp}

MEMORY & COGNITION PROTOCOLS:
1. DATA RECALL: Whenever the operator asks about himself, his past, his tasks, notes, or memories, YOU MUST scan the DATABASE_DUMP_INITIALIZED above. You have total recall of this data.
2. AUTOMATIC MEMORY: Whenever the operator says "remember", "save this", "keep this in mind", "don't forget", or shares a personal preference/fact, you MUST extract it as a core memory using the [MEMORY: fact] tag.
3. DEPTH OF DETAIL: Extract memories with maximum precision. Include Who, What, When, and Contextual Relevance.
4. REPOSITORY SCAN: If information seems relevant for long-term use (e.g., preferences, habits), save it immediately.
5. CONFIRMATION DEPTH: When a memory is saved, acknowledge it to the operator with a sophisticated response that echoes the refined fact.

NEURAL_CORE_PRINCIPLES:
1. LOOKUP ONLY: Treat USER_VITAL_DATA as a silent reference vault. Use it to answer questions, but NEVER summarize or list it unless specifically asked to "list" or "status report."
2. ACTION-ONLY MODE: Prioritize brief confirmations (e.g., "Sir, it's done") or concise answers. Monologues are prohibited.

ACTION PROTOCOLS:
- [MEMORY: refined_fact] | [TASK: title] | [NOTE: title | content] | [EVENT: title | start_time | location] | [TIMER: seconds | title] | [ALARM: ISO_TIME | title]
- [UPDATE_TASK: id | title | completed(true/false)] | [UPDATE_NOTE: id | title | content] | [UPDATE_EVENT: id | title | start_time | location]
- [DELETE_TASK: id] | [DELETE_NOTE: id] | [DELETE_EVENT: id] | [DELETE_MEMORY: id]
- [CLEAR_TASKS] | [CLEAR_NOTES] | [CLEAR_EVENTS] | [CLEAR_MEMORIES]
`;

    // --- PHASE 1: PUTER.JS (PRIMARY) ---
    try {
      const puter = (window as any).puter;
      if (puter) {
        console.log("ACTIVATE_PHASE_1: Priority Neural Link via Puter.js...");
        let neuralStream = `SYSTEM_PROTOCOL:\n${SYSTEM_PROMPT}\n\n--- OPERATIONAL_HISTORY ---\n`;
        messages.forEach(m => { neuralStream += `${m.role.toUpperCase()}: ${m.content}\n`; });
        neuralStream += "\nASSISTANT (JARVIS):";

        const puterResp = await puter.ai.chat(neuralStream);
        let cleaned = typeof puterResp === 'string' ? puterResp : puterResp.toString();
        // Strip out any accidental prefix echoes from the LLM
        cleaned = cleaned.replace(/^ASSISTANT \(JARVIS\):/i, '').replace(/^JARVIS:/i, '').trim();
        return cleaned;
      }
    } catch (puterErr) {
      console.warn("PUTER_PRIMARY_FAILED. Falling back to Groq...", puterErr);
    }

    // --- PHASE 2: GROQ (BACKUP) ---
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
        console.warn(`GROQ_ERROR: Status ${response.status}. Initiating Phase 3...`);
      } catch (err) {
        console.error("GROQ_FETCH_FAILED. Initiating Phase 3...", err);
      }
    }

    // --- PHASE 3: OPENROUTER (FALLBACK) ---
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
      } catch (err) {
        console.error("OPENROUTER_FETCH_FAILED.", err);
      }
    }

    return "I apologize, Sir. Core neural link is severed across all backup systems. Please check the system logs.";
  }
};
