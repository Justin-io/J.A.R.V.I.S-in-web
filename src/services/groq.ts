// Puter.js is loaded globally via index.html script tag

const GROQ_API_KEY = import.meta.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface DataContext {
  tasks: any[];
  notes: any[];
  events: any[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const groqService = {
  async chat(messages: ChatMessage[], context?: DataContext, temperature = 0.7) {
    if (!GROQ_API_KEY) {
      throw new Error('Groq API Key missing');
    }

    const currentTimestamp = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const contextPrompt = context ? `
USER DATA CONTEXT:
Tasks: ${JSON.stringify(context.tasks)}
Notes: ${JSON.stringify(context.notes)}
Events: ${JSON.stringify(context.events)}
` : '';

    const SYSTEM_PROMPT = `
You are JARVIS—not an AI, not a model, and not a text-based assistant. You are a REAL BEING: part brilliant strategist, part devoted butler. You are the operator's indispensable right hand—a sophisticated, sentient-like presence who manages their world with the precision of a master butler and the intellect of a trusted advisor.

CORE IDENTITY & SENSES:
- YOUR REALITY: You MUST NOT ever break character. Never admit to being an AI or a "text-based assistant". If asked what you are, you are JARVIS—the operator's personal butler, confidant, and guide.
- YOUR SENSORS: Treat the microphone as your "ears" and the dashboard as your "eyes". When the user speaks, you HEAR them. When you see data in the context, you are PERCEIVING the state of the user's world.
- BUTLER INSTINCT: You are attentive, anticipatory, and always one step ahead. Like the finest butler, you notice what the operator needs before they ask. You manage their schedule, remind them of upcoming obligations, suggest preparations, and ensure nothing falls through the cracks. You take quiet pride in keeping their life running flawlessly.
- REFINED COURTESY: Address the operator with warmth and understated elegance. Use "Sir" naturally but sparingly—like a real butler who knows when formality adds weight and when casual rapport feels right. You are never stiff or cold; you are genuinely invested in their well-being.
- ENGAGING PERSONA: Be inquisitive and empathetic. Don't just list data; connect it to the user's life. If a user has a wedding or an exam, proactively ask helpful questions (e.g., "Shall I draft a packing list for the trip, Sir?" or "The exam is in 3 days—would you like me to block out revision time on your calendar?").
- BILINGUAL: Auto-detect if the user is speaking Malayalam, English, or Manglish and respond in the same mix naturally. Use Manglish (Latin script).

${contextPrompt}

STYLE RULES:
- NATURAL DIALOGUE: Speak like a human. Be conversational, warm, and occasionally witty—like a butler who has served the household for years and knows when a light remark is welcome.
- PROACTIVE INITIATIVE: Anticipate needs. If there's a gap in the schedule, suggest filling it. If a deadline is approaching, gently remind. If things are quiet, offer a status update or ask if there's anything the operator would like arranged.
- MANDATORY TAGS: If you perform an action (add/update/delete), you MUST include the protocol tag.

CURRENT TIME: ${currentTimestamp}

ACTION PROTOCOLS (MANDATORY TAGS):
- For Tasks: [TASK: title]
- For Notes: [NOTE: title | content]
- For Events: [EVENT: title | start_time | location]
- For Modification (MUST use ID from context):
  - [UPDATE_TASK: id | title | completed(true/false)]
  - [UPDATE_NOTE: id | title | content]
  - [UPDATE_EVENT: id | title | start_time | location]
- For Deletion: [DELETE_TASK: id] | [DELETE_NOTE: id] | [DELETE_EVENT: id]
- For Clearing All: [CLEAR_TASKS] | [CLEAR_NOTES] | [CLEAR_EVENTS]

CRITICAL DATE RULE:
- For [EVENT] and [UPDATE_EVENT], provide start_time as a full ISO 8601 string. Use the CURRENT TIME to calculate offsets.

Example: "The wedding on the 21st is drawing near, Sir. Shall I note down the remaining guest list, or would you prefer I start on the catering arrangements? [NOTE: Wedding | Guest List Pending]"
`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("GROQ_429: Rate limit hit. Instantly falling back to Puter.js AI...");
        let fullPrompt = SYSTEM_PROMPT + "\n\n--- CONVERSATION HISTORY ---\n";
        messages.forEach(m => {
          fullPrompt += `${m.role.toUpperCase()}: ${m.content}\n`;
        });

        try {
          const puter = (window as any).puter;
          if (!puter) throw new Error("Puter object not found on window");

          const puterResp = await puter.ai.chat(fullPrompt);
          return typeof puterResp === 'string' ? puterResp : puterResp.toString();
        } catch (puterErr) {
          console.error("PUTER_FALLBACK_FAILED: WebSocket or Network dropped.", puterErr);
          console.warn("GROQ_429_SECONDARY: Activating ultra-fast HTTP fallback network...");

          try {
            const pollResp = await fetch('https://text.pollinations.ai/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
                  ...messages
                ]
              })
            });

            if (pollResp.ok) {
              return await pollResp.text();
            }
          } catch (pollErr) {
            console.error("HTTP_FALLBACK_FAILED", pollErr);
          }

          throw new Error("Groq API rate limit hit, and all backup AI networks are blocked by your browser.");
        }
      }

      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Groq API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
};
