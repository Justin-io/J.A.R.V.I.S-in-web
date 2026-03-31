import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { useChatStore } from '../store/chatStore';
import { useVoice } from '../hooks/useVoice';
import { CalendarWidget } from './widgets/CalendarWidget';
import { TodoWidget } from './widgets/TodoWidget';
import { NoteWidget } from './widgets/NoteWidget';
import { MemoryWidget } from './widgets/MemoryWidget';
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
import { useMemoryStore } from '../store/memoryStore';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { messages, sendMessage, isThinking, fetchMessages, subscribeToMessages } = useChatStore();
  const {
    handleMicClick, speak, isListening, transcript, setTranscript,
    rawTranscript, isSpeaking, isWaitingForCommand, audioAuthorized, toggleAudio
  } = useVoice();
  const { addTask, updateTask, deleteTask, clearTasks, fetchTasks } = useTodoStore();
  const { addNote, updateNote, deleteNote, clearNotes, fetchNotes } = useNoteStore();
  const { addEvent, updateEvent, deleteEvent, clearEvents, fetchEvents } = useCalendarStore();
  const { fetchMemories, addMemory, removeMemory, clearMemories } = useMemoryStore();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputVal, setInputVal] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [pendingMemoryClear, setPendingMemoryClear] = useState(false);
  const booted = useRef(false);
  const puterCheckPerformed = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { handleMicClick(); }, [handleMicClick]);

  // Fetch all data from Supabase on boot
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchMessages(user.id),
        fetchTasks(user.id),
        fetchNotes(user.id),
        fetchEvents(user.id),
        fetchMemories(user.id),
      ]).then(() => setDataLoaded(true));

      const channel = subscribeToMessages(user.id);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchMessages, subscribeToMessages, fetchTasks, fetchNotes, fetchEvents, fetchMemories]);

  // PUTER MOBILE AUTO-SETUP
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (isMobile && !puterCheckPerformed.current) {
      puterCheckPerformed.current = true;
      const puter = (window as any).puter;
      if (puter) {
        // Check if signed in, if not, trigger a tiny "ghost" request to force the connection prompt
        if (!puter.auth.isSignedIn()) {
          console.log("MOBILE_AUTO_SETUP: Triggering Puter connection prompt...");
          // Ghost request: tiny contextless prompt to trigger the 'Connect' popup
          puter.ai.chat("ping").catch(() => {});
        }
      }
    }
  }, []);

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
      handleUserAction("System initialized. Give a very short, direct 1-sentence greeting. Only mention schedule/tasks if something is urgently pending. Do not list empty data.");
    }
  }, [user, dataLoaded]);

  const handleUserAction = async (content: string) => {
    if (!user) return;
    if (!chatOpen) setChatOpen(true);

    // VOICE CLEAR CONFIRMATION LOGIC
    if (pendingMemoryClear) {
      if (content.toLowerCase().includes('confirm') || content.toLowerCase().includes('yes') || content.toLowerCase().includes('proceed')) {
        await clearMemories(user.id);
        setPendingMemoryClear(false);
        speak("Core memory wipe complete, Sir. I have shifted into a blank state.");
        return;
      } else {
        setPendingMemoryClear(false);
        speak("Wipe aborted. Core systems remain intact.");
        return;
      }
    }

    const response = await sendMessage(content, user.id, { 
      tasks: useTodoStore.getState().tasks, 
      notes: useNoteStore.getState().notes, 
      events: useCalendarStore.getState().events, 
      memories: useMemoryStore.getState().memories 
    });
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
      const memoryRegex = /\[MEMORY:\s*(.*?)\]/gi;
      const delMemoryRegex = /\[DELETE_MEMORY:\s*(.*?)\]/gi;

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
      while ((match = memoryRegex.exec(response)) !== null) {
        await addMemory(match[1].trim(), user.id);
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
      while ((match = delMemoryRegex.exec(response)) !== null) {
        await removeMemory(match[1].trim());
        spokenResponse = spokenResponse.replace(match[0], '');
      }

      const clearTasksMatch = response.match(/\[CLEAR_TASKS\]/i);
      const clearNotesMatch = response.match(/\[CLEAR_NOTES\]/i);
      const clearEventsMatch = response.match(/\[CLEAR_EVENTS\]/i);
      const clearMemoriesMatch = response.match(/\[CLEAR_MEMORIES\]/i);

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
      if (clearMemoriesMatch) {
        setPendingMemoryClear(true);
        spokenResponse = "Sir, I have detected a request to clear all core memories. This is a sensitive operation that will permanently erase my understanding of your preferences. Do you wish to proceed with the system wipe?";
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
    <div className="flex h-[100dvh] w-screen bg-[#020608] text-primary font-mono overflow-hidden select-none relative">
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
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute md:relative left-0 top-0 bottom-0 z-40 w-full sm:w-96 flex flex-col bg-black/95 md:bg-black/60 border-r border-primary/10 backdrop-blur-xl overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-primary/60" />
                <span className="text-[12px] md:text-sm tracking-[0.25em] uppercase text-primary/60">System Monitor</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-primary/30 hover:text-primary/70 transition-colors p-2 rounded bg-primary/5 hover:bg-primary/20 md:hidden">
                <X className="w-5 h-5" />
              </button>
              <button onClick={() => setSidebarOpen(false)} className="hidden md:block text-primary/30 hover:text-primary/70 transition-colors p-1 rounded">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Status Grid */}
            <div className="px-4 py-4 border-b border-primary/5">
              <StatusGrid />
            </div>

            {/* Widgets Section Header */}
            <div className="px-6 py-3 bg-primary/5 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.4em] font-black text-primary/40 uppercase">Organization_Suite</span>
            </div>

            {/* Widgets */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {user && (
                <>
                  <MemoryWidget />
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
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-black/90 border-2 border-primary/40 border-l-0 p-3 text-primary shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:bg-primary/20 hover:text-white transition-colors rounded-r-md"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* === MAIN CENTER PANEL === */}
      <div className="relative flex-1 flex flex-col z-10 overflow-hidden">

        {/* TOP NAV BAR */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-black/40 backdrop-blur-sm flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            {/* Hamburger on mobile to toggle sidebar */}
            <button onClick={() => setSidebarOpen(v => !v)} className="md:hidden text-primary/70 border border-primary/30 p-2 rounded-md bg-primary/10">
              <Terminal className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 border border-primary/50 flex items-center justify-center bg-primary/5 rounded-sm">
              <Zap className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-[0.4em] uppercase text-primary" style={{ textShadow: '0 0 20px rgba(0,243,255,0.8)' }}>
                JARVIS
              </h1>
              <p className="text-[10px] md:text-xs text-primary/60 tracking-widest font-bold">OPERATOR: {user?.email?.split('@')[0].toUpperCase()}</p>
            </div>
            <div className="hidden lg:flex items-center gap-2 ml-6 px-3 py-1.5 border border-primary/20 rounded-sm bg-primary/5 shadow-[0_0_10px_rgba(0,243,255,0.1)]">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isWaitingForCommand ? 'bg-green-400' : isSpeaking ? 'bg-blue-400' : isThinking ? 'bg-yellow-400' : 'bg-primary'}`} />
              <span className={`text-[10px] tracking-[0.2em] font-bold ${statusColor}`}>{statusLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-bold text-primary/40 tracking-widest">
              <Shield className="w-4 h-4" />
              <span>AES-256 SEC_LINK</span>
            </div>
            <div className="hidden sm:block">
               <DigitalClock />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChatOpen(v => !v)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] md:text-xs font-bold tracking-widest border transition-all ${chatOpen ? 'bg-primary/20 border-primary/60 text-white shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'bg-black/50 border-primary/30 text-primary/70 hover:text-primary hover:border-primary/50'}`}
              >
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">COMMS</span>
                {messages.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-black text-[9px] flex items-center justify-center font-black shadow-[0_0_10px_rgba(0,243,255,1)]">
                    {messages.length > 9 ? '9+' : messages.length}
                  </span>
                )}
              </button>
              <button
                onClick={signOut}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] md:text-xs font-bold tracking-widest border border-primary/20 text-primary/50 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                <span>EXIT</span>
              </button>
            </div>
          </div>
        </header>

        {/* CORE AREA */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">

          {/* NEURAL INITIALIZATION MODAL */}
          <AnimatePresence>
            {!audioAuthorized && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] backdrop-blur-2xl bg-black/90 flex items-center justify-center p-6"
              >
                <div className="max-w-md w-full text-center space-y-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative inline-block"
                  >
                    <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full animate-pulse"></div>
                    <div className="relative w-32 h-32 border-2 border-primary/30 rounded-full flex items-center justify-center mx-auto">
                      <Zap className="w-16 h-16 text-primary animate-pulse" />
                      <div className="absolute inset-[-10px] border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                      <div className="absolute inset-[-20px] border border-primary/10 border-dashed rounded-full animate-[spin_20s_linear_reverse_infinite]"></div>
                    </div>
                  </motion.div>

                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-[0.3em] text-primary hud-text-glow uppercase">Neural Link Severed</h2>
                    <p className="text-[10px] text-primary/60 tracking-[0.2em] leading-relaxed uppercase">
                      Browser security protocols have isolated the neural core. Manual initialization is required to re-establish the auditory link.
                    </p>
                  </div>

                  <button
                    onClick={toggleAudio}
                    className="w-full py-6 bg-primary/10 border-2 border-primary/40 text-primary font-bold tracking-[0.5em] text-sm uppercase hover:bg-primary/20 hover:border-primary transition-all duration-500 shadow-[0_0_30px_rgba(0,243,255,0.1)] relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    INITIALIZE NEURAL LINK
                  </button>

                  <div className="flex items-center justify-center gap-4 text-[8px] text-primary/30 tracking-[0.2em] uppercase">
                    <span className="w-12 h-[1px] bg-primary/20"></span>
                    Identity Locked: {user?.id.substring(0, 8)}...
                    <span className="w-12 h-[1px] bg-primary/20"></span>
                  </div>
                </div>
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
              onClick={handleMicClick}
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

        <footer className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-primary/20 bg-black/60 text-[10px] md:text-xs tracking-[0.2em] text-primary/40 font-bold z-20">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              ONLINE
            </span>
            <span className="hidden sm:inline">NEURAL-LINK: ACTIVE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden lg:inline text-primary/50">SYSTEM_UPTIME: 99.9%</span>
            <span className="hidden lg:inline text-primary/30">|</span>
            <span className="text-primary/70 tracking-[0.3em]">JARVIS_PROTOCOL_V2.4</span>
          </div>
        </footer>
      </div>

      {/* === RIGHT CHAT PANEL === */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute md:relative z-40 md:z-10 right-0 top-0 bottom-0 w-full sm:w-96 flex flex-col bg-black/95 md:bg-black/60 border-l border-primary/10 backdrop-blur-xl"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary/60" />
                <span className="text-[12px] md:text-sm font-bold tracking-[0.25em] uppercase text-primary/60">System Communication</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-primary/30 hover:text-white bg-primary/5 hover:bg-primary/30 p-2 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-30">
                  <MessageSquare className="w-10 h-10" />
                  <p className="text-xs tracking-[0.3em] font-bold uppercase">No exchanges yet</p>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className={`text-[10px] md:text-[11px] font-bold mb-1 uppercase tracking-widest ${m.role === 'user' ? 'text-primary/60' : 'text-blue-400/80'}`}>
                    {m.role === 'user' ? 'OPERATOR' : 'JARVIS'}
                  </span>
                  <div className={`px-4 py-3 text-xs md:text-sm leading-relaxed rounded-md border shadow-lg max-w-[95%]
                    ${m.role === 'user'
                      ? 'bg-primary/10 border-primary/30 text-primary text-right shadow-[0_0_15px_rgba(0,243,255,0.1)]'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-100 text-left shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-4 border-t border-primary/20 bg-black/60">
              <div className="flex items-center gap-3 bg-black/80 border-2 border-primary/30 rounded-md px-4 py-3 focus-within:border-primary/70 focus-within:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="Manual override input..."
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-transparent text-sm md:text-base font-bold outline-none text-primary placeholder:text-primary/30 font-mono"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputVal.trim()}
                  className="text-primary/60 hover:text-white bg-primary/10 hover:bg-primary/40 p-2 rounded-md transition-all disabled:opacity-20"
                >
                  <Send className="w-5 h-5" />
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
