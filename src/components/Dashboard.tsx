import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useVoice } from '../hooks/useVoice';
import { CalendarWidget } from './widgets/CalendarWidget';
import { TodoWidget } from './widgets/TodoWidget';
import { NoteWidget } from './widgets/NoteWidget';
import { NeuralCore } from './ui/NeuralCore';
import { DigitalClock } from './ui/DigitalClock';
import { StatusGrid } from './ui/StatusGrid';
import {
  Mic, MicOff, LogOut, Zap, MessageSquare, X,
  ChevronLeft, ChevronRight, Send, Shield, Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTodoStore } from '../store/todoStore';
import { useNoteStore } from '../store/noteStore';
import { useCalendarStore } from '../store/calendarStore';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { messages, sendMessage, isThinking } = useChatStore();
  const {
    listen, speak, isListening, transcript, setTranscript,
    rawTranscript, isSpeaking, audioAuthorized, toggleAudio, isWaitingForCommand
  } = useVoice();
  const { addTask, updateTask, deleteTask, clearTasks, tasks, fetchTasks } = useTodoStore();
  const { addNote, updateNote, deleteNote, clearNotes, notes, fetchNotes } = useNoteStore();
  const { addEvent, updateEvent, deleteEvent, clearEvents, events, fetchEvents } = useCalendarStore();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputVal, setInputVal] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const booted = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { listen(); }, [listen]);

  // Fetch all data from Supabase on boot
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchTasks(user.id),
        fetchNotes(user.id),
        fetchEvents(user.id),
      ]).then(() => setDataLoaded(true));
    }
  }, [user, fetchTasks, fetchNotes, fetchEvents]);

  useEffect(() => {
    if (transcript) {
      handleUserAction(transcript);
      setTranscript('');
    }
  }, [transcript, setTranscript]);

  // Boot Sequence Briefing — waits for data to load first
  useEffect(() => {
    if (user && !booted.current && dataLoaded) {
      booted.current = true;
      handleUserAction("System initial sequence complete. Provide a highly concise status briefing based on my current data.");
    }
  }, [user, dataLoaded]);

  const handleUserAction = async (content: string) => {
    if (!user) return;
    if (!chatOpen) setChatOpen(true);
    const response = await sendMessage(content, user.id, { tasks, notes, events });
    console.log("JARVIS RAW RESPONSE:", response);

    if (response) {
      let spokenResponse = response;
      
      // Multi-match processing
      const taskRegex = /\[TASK:\s*(.*?)\]/gi;
      const noteRegex = /\[NOTE:\s*(.*?)(?:\|(.*?))?\]/gi;
      const eventRegex = /\[EVENT:\s*(.*?)\|(.*?)(?:\|(.*?))?\]/gi;
      const updateTaskRegex = /\[UPDATE_TASK:\s*(.*?)\|(.*?)\|(.*?)\]/gi;
      const updateNoteRegex = /\[UPDATE_NOTE:\s*(.*?)\|(.*?)(?:\|(.*?))?\]/gi;
      const updateEventRegex = /\[UPDATE_EVENT:\s*(.*?)\|(.*?)\|(.*?)(?:\|(.*?))?\]/gi;
      const delTaskRegex = /\[DELETE_TASK:\s*(.*?)\]/gi;
      const delNoteRegex = /\[DELETE_NOTE:\s*(.*?)\]/gi;
      const delEventRegex = /\[DELETE_EVENT:\s*(.*?)\]/gi;

      let match;

      // Executions
      while ((match = taskRegex.exec(response)) !== null) {
        await addTask({ title: match[1].trim() }, user.id);
        spokenResponse = spokenResponse.replace(match[0], '');
      }
      while ((match = noteRegex.exec(response)) !== null) {
        await addNote({ title: match[1].trim(), content: match[2]?.trim() || '' }, user.id);
        spokenResponse = spokenResponse.replace(match[0], '');
      }
      while ((match = eventRegex.exec(response)) !== null) {
        await addEvent({
          title: match[1].trim(),
          start_time: match[2].trim(),
          end_time: match[2].trim(),
          location: match[3]?.trim() || ''
        }, user.id);
        spokenResponse = spokenResponse.replace(match[0], '');
      }

      // Updates
      while ((match = updateTaskRegex.exec(response)) !== null) {
        await updateTask(match[1].trim(), { 
          title: match[2].trim(), 
          status: match[3].trim() === 'true' ? 'completed' : 'pending' 
        });
        spokenResponse = spokenResponse.replace(match[0], '');
      }
      while ((match = updateNoteRegex.exec(response)) !== null) {
        await updateNote(match[1].trim(), { 
          title: match[2].trim(), 
          content: match[3]?.trim() || '' 
        });
        spokenResponse = spokenResponse.replace(match[0], '');
      }
      while ((match = updateEventRegex.exec(response)) !== null) {
        await updateEvent(match[1].trim(), {
          title: match[2].trim(),
          start_time: match[3].trim(),
          end_time: match[3].trim(),
          location: match[4]?.trim() || ''
        });
        spokenResponse = spokenResponse.replace(match[0], '');
      }

      while ((match = delTaskRegex.exec(response)) !== null) {
        await deleteTask(match[1].trim());
        spokenResponse = spokenResponse.replace(match[0], '');
      }
      while ((match = delNoteRegex.exec(response)) !== null) {
        await deleteNote(match[1].trim());
        spokenResponse = spokenResponse.replace(match[0], '');
      }
      while ((match = delEventRegex.exec(response)) !== null) {
        await deleteEvent(match[1].trim());
        spokenResponse = spokenResponse.replace(match[0], '');
      }

      const clearTasksMatch = response.match(/\[CLEAR_TASKS\]/i);
      const clearNotesMatch = response.match(/\[CLEAR_NOTES\]/i);
      const clearEventsMatch = response.match(/\[CLEAR_EVENTS\]/i);

      if (clearTasksMatch) {
        await clearTasks(user.id);
        spokenResponse = spokenResponse.replace(clearTasksMatch[0], '');
      }
      if (clearNotesMatch) {
        await clearNotes(user.id);
        spokenResponse = spokenResponse.replace(clearNotesMatch[0], '');
      }
      if (clearEventsMatch) {
        await clearEvents(user.id);
        spokenResponse = spokenResponse.replace(clearEventsMatch[0], '');
      }

      speak(spokenResponse.trim());
    } else {
      speak("I apologize, Sir. I'm experiencing some difficulty connecting to the core server.");
    }
  };

  const handleSend = () => {
    if (!inputVal.trim()) return;
    handleUserAction(inputVal.trim());
    setInputVal('');
  };

  const statusLabel = isSpeaking
    ? 'SPEAKING'
    : isThinking
    ? 'PROCESSING'
    : isWaitingForCommand
    ? 'AWAITING COMMAND'
    : isListening
    ? 'PASSIVE SCAN'
    : 'STANDBY';

  const statusColor = isSpeaking
    ? 'text-blue-400'
    : isThinking
    ? 'text-yellow-400'
    : isWaitingForCommand
    ? 'text-green-400'
    : 'text-primary';

  return (
    <div className="flex h-screen w-screen bg-[#020608] text-primary font-mono overflow-hidden select-none">
      {/* === SCANLINE + GRID OVERLAY === */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,243,255,0.5)_2px,rgba(0,243,255,0.5)_3px)]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(0,243,255,0.08)_0%,transparent_100%)]" />
      </div>

      {/* === LEFT SIDEBAR === */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="relative z-10 w-72 min-w-[280px] flex flex-col bg-black/60 border-r border-primary/10 backdrop-blur-md overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary/60" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-primary/60">System Monitor</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-primary/30 hover:text-primary/70 transition-colors p-1 rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Status Grid */}
            <div className="px-4 py-4 border-b border-primary/5">
              <StatusGrid />
            </div>

            {/* Widgets Section Header */}
            <div className="px-4 py-2 bg-primary/5 flex items-center justify-between">
              <span className="text-[7px] tracking-[0.4em] font-black text-primary/40 uppercase">Organization_Suite</span>
            </div>

            {/* Widgets */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {user && (
                <>
                  <CalendarWidget userId={user.id} />
                  <TodoWidget userId={user.id} />
                  <NoteWidget userId={user.id} />
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar toggle (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-black/80 border border-primary/20 border-l-0 p-2 text-primary/50 hover:text-primary transition-colors rounded-r-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* === MAIN CENTER PANEL === */}
      <div className="relative flex-1 flex flex-col z-10 overflow-hidden">

        {/* TOP NAV BAR */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-primary/10 bg-black/40 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-primary/50 flex items-center justify-center bg-primary/5 rounded-sm">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-[0.35em] uppercase text-primary" style={{ textShadow: '0 0 20px rgba(0,243,255,0.5)' }}>
                JARVIS
              </h1>
              <p className="text-[7px] text-primary/40 tracking-widest">OPERATOR: {user?.email?.split('@')[0].toUpperCase()}</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2 py-1 border border-primary/10 rounded-sm bg-primary/5">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isWaitingForCommand ? 'bg-green-400' : isSpeaking ? 'bg-blue-400' : isThinking ? 'bg-yellow-400' : 'bg-primary'}`} />
              <span className={`text-[8px] tracking-[0.2em] font-bold ${statusColor}`}>{statusLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-1 text-[7px] text-primary/30 tracking-widest">
              <Shield className="w-3 h-3" />
              <span>AES-256 SEC_LINK</span>
            </div>
            <DigitalClock />
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChatOpen(v => !v)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[8px] tracking-widest border transition-all ${chatOpen ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-transparent border-primary/15 text-primary/50 hover:text-primary/80 hover:border-primary/30'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">COMMS</span>
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-black text-[6px] flex items-center justify-center font-bold">
                    {messages.length > 9 ? '9+' : messages.length}
                  </span>
                )}
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[8px] tracking-widest border border-primary/15 text-primary/40 hover:text-red-400 hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">EXIT</span>
              </button>
            </div>
          </div>
        </header>

        {/* CORE AREA */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">

          {/* Audio authorization banner */}
          <AnimatePresence>
            {!audioAuthorized && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-red-950/80 border border-red-500/40 px-5 py-3 rounded-sm backdrop-blur-md text-[10px] tracking-wider"
              >
                <Zap className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" />
                <span className="text-red-300">AUDIO RESTRICTED BY BROWSER POLICY</span>
                <button
                  onClick={toggleAudio}
                  className="ml-2 px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/40 rounded-sm transition-all text-[8px] tracking-widest font-bold"
                >
                  AUTHORIZE
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* NEURAL CORE + TRANSCRIPT — radial HUD layout */}
          <div className="flex flex-col items-center gap-6 w-full max-w-lg px-6">

            {/* Neural Brain Visual */}
            <div className="relative">
              {/* Decorative outer arcs */}
              <div className="absolute inset-[-28px] rounded-full border border-primary/5 pointer-events-none" />
              <div className="absolute inset-[-16px] rounded-full border border-primary/10 pointer-events-none animate-[spin_40s_linear_infinite]"
                style={{ borderStyle: 'dashed' }} />
              <NeuralCore
                isListening={isListening}
                isThinking={isThinking}
                isSpeaking={isSpeaking}
              />
            </div>

            {/* Transcript Row */}
            <div className="w-full min-h-[40px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {rawTranscript ? (
                  <motion.div
                    key="raw"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-2 bg-primary/5 border border-primary/15 px-4 py-2 rounded-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                    <p className="text-[10px] text-primary/80 tracking-[0.15em] uppercase font-mono truncate max-w-xs">
                      {rawTranscript}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.25 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] text-primary/50 tracking-[0.3em] uppercase animate-pulse"
                  >
                    ··· PASSIVE MONITORING ACTIVE ···
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Mic Button */}
            <button
              onClick={listen}
              disabled={isListening || isThinking}
              className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40
                ${isListening
                  ? 'bg-red-500/15 border-2 border-red-500/60 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)] scale-110'
                  : 'bg-primary/5 border border-primary/25 text-primary/70 hover:text-primary hover:border-primary/60 hover:shadow-[0_0_25px_rgba(0,243,255,0.2)] hover:scale-105 active:scale-95'
                }`}
            >
              {isListening
                ? <MicOff className="w-6 h-6" />
                : <Mic className="w-6 h-6" />
              }
              {isListening && (
                <span className="absolute inset-0 rounded-full border-2 border-red-400/30 animate-ping" />
              )}
            </button>
          </div>

          {/* CORNER HUD ACCENTS */}
          <div className="absolute top-3 left-3 w-10 h-10 border-l-2 border-t-2 border-primary/15 rounded-tl pointer-events-none" />
          <div className="absolute top-3 right-3 w-10 h-10 border-r-2 border-t-2 border-primary/15 rounded-tr pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-10 h-10 border-l-2 border-b-2 border-primary/15 rounded-bl pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-10 h-10 border-r-2 border-b-2 border-primary/15 rounded-br pointer-events-none" />
        </div>

        {/* BOTTOM STATUS BAR */}
        <footer className="flex-shrink-0 flex items-center justify-between px-6 py-1.5 border-t border-primary/10 bg-black/40 text-[7px] tracking-[0.2em] text-primary/30 font-bold">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              ONLINE
            </span>
            <span className="hidden sm:inline">NEURAL-LINK: ACTIVE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-primary/40">SYSTEM_UPTIME: 99.9%</span>
            <span className="text-primary/20">|</span>
            <span className="text-primary/50 tracking-[0.3em]">JARVIS_PROTOCOL_V2.4</span>
          </div>
        </footer>
      </div>

      {/* === RIGHT CHAT PANEL === */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="relative z-10 w-80 min-w-[300px] flex flex-col bg-black/60 border-l border-primary/10 backdrop-blur-md"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary/60" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-primary/60">System Communication</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-primary/30 hover:text-primary/70 p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-2 opacity-20">
                  <MessageSquare className="w-8 h-8" />
                  <p className="text-[9px] tracking-widest uppercase">No exchanges yet</p>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className={`text-[7px] mb-1 uppercase tracking-widest ${m.role === 'user' ? 'text-primary/40' : 'text-blue-400/50'}`}>
                    {m.role === 'user' ? 'OPERATOR' : 'JARVIS'}
                  </span>
                  <div className={`px-3 py-2 text-[10px] leading-relaxed rounded-sm border max-w-[90%]
                    ${m.role === 'user'
                      ? 'bg-primary/5 border-primary/15 text-primary/80 text-right'
                      : 'bg-blue-500/5 border-blue-500/15 text-blue-300/80 text-left'
                    }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-3 border-t border-primary/10">
              <div className="flex items-center gap-2 bg-black/40 border border-primary/15 rounded-sm px-3 py-2 focus-within:border-primary/40 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="Manual override..."
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-transparent text-[10px] outline-none text-primary/70 placeholder:text-primary/20 font-mono"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputVal.trim()}
                  className="text-primary/40 hover:text-primary transition-colors disabled:opacity-20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === SCROLLBAR & GLOBAL STYLES === */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,243,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,243,255,0.15); border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,243,255,0.35); }
      `}</style>
    </div>
  );
};
