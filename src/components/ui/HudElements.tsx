import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HudPanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const HudPanel: React.FC<HudPanelProps> = ({ children, title, className = "" }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`hud-panel p-4 relative ${className}`}
    >
      <div className="scanline"></div>
      
      {/* Corner Brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/40 m-1"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/40 m-1"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary/40 m-1"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary/40 m-1"></div>

      {title && (
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary animate-pulse-glow"></div>
            <h2 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase hud-text-glow">
              {title}
            </h2>
          </div>
          <div className="text-[8px] font-mono text-primary/30 tracking-widest">SEC_SYS_V4</div>
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export const HudButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = "", ...props }) => {
  return (
    <button 
      className={`
        relative px-6 py-2 bg-transparent border border-primary/50 text-primary 
        uppercase tracking-widest text-[10px] font-bold overflow-hidden transition-all
        hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]
        active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-primary"></div>
      <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-primary"></div>
      <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-primary"></div>
      <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-primary"></div>
      {children}
    </button>
  );
};
