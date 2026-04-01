import React, { useEffect, useState } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { Trash2, Clock, Bell, Zap, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export const TimerWidget: React.FC = () => {
  const { timers, removeTimer, addTimer } = useTimerStore();
  const { user } = useAuthStore();
  const [, setTick] = useState(0);

  // Re-render every second to update countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeLeft = (endTime: string) => {
    const diff = Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (timer: any) => {
    if (timer.isAlarm) return 100;
    const total = timer.duration;
    const left = Math.max(0, (new Date(timer.endTime).getTime() - Date.now()) / 1000);
    return (left / total) * 100;
  };

  const handleQuickTimer = () => {
    if (user) addTimer("Quick Neural Test", 30, user.id);
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-sm overflow-hidden mb-3">
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10 bg-primary/10">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] tracking-[0.25em] font-black text-primary uppercase">Neural_Schedule</span>
        </div>
        <button 
          onClick={handleQuickTimer}
          className="p-1 hover:bg-primary/20 rounded transition-colors group"
          title="Manual override: 30s test"
        >
          <Play className="w-3 h-3 text-primary/40 group-hover:text-primary" />
        </button>
      </div>
      
      <div className="p-2 space-y-2 min-h-[60px] flex flex-col justify-center">
        <AnimatePresence mode="popLayout">
          {timers.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-4 opacity-20"
            >
              <Zap className="w-5 h-5 mb-1" />
              <span className="text-[8px] tracking-[0.3em] font-bold uppercase">Chronos Standby</span>
            </motion.div>
          ) : (
            timers.map((timer) => (
              <motion.div
                key={timer.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="group flex items-center justify-between bg-black/60 border border-primary/20 rounded-sm px-3 py-2 shadow-[0_0_10px_rgba(0,243,255,0.05)]"
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {timer.isAlarm ? <Bell className="w-3 h-3 text-yellow-400 animate-pulse" /> : <Clock className="w-3 h-3 text-primary" />}
                    <span className="text-[9px] text-primary/90 font-bold tracking-wider uppercase truncate">
                      {timer.title || (timer.isAlarm ? 'SUB_ALARM' : 'SUB_TIMER')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     {!timer.isAlarm && (
                       <div className="h-1 w-full max-w-[80px] bg-primary/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary/60 transition-all duration-1000"
                            style={{ width: `${getProgress(timer)}%` }}
                          />
                       </div>
                     )}
                     <span className={`text-[10px] font-mono leading-none ${new Date(timer.endTime).getTime() - Date.now() < 10000 ? 'text-red-400 animate-pulse' : 'text-primary/60'}`}>
                      {timer.isAlarm ? new Date(timer.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formatTimeLeft(timer.endTime)}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => removeTimer(timer.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-primary/30 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
