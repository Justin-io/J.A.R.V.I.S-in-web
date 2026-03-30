import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
}

export const NeuralCore: React.FC<Props> = ({ isListening, isSpeaking, isThinking }) => {
  // Determine core color based on state
  const getCoreColor = () => {
    if (isListening) return 'rgba(239, 68, 68, 0.9)'; // Red
    if (isThinking) return 'rgba(234, 179, 8, 0.9)'; // Yellow
    if (isSpeaking) return 'rgba(56, 189, 248, 0.9)'; // Blue
    return 'rgba(0, 243, 255, 0.6)'; // Standard Cyan
  };

  const getGlowColor = () => {
    if (isListening) return 'rgba(239, 68, 68, 0.4)';
    if (isThinking) return 'rgba(234, 179, 8, 0.4)';
    if (isSpeaking) return 'rgba(56, 189, 248, 0.4)';
    return 'rgba(0, 243, 255, 0.2)';
  };

  const currentColor = getCoreColor();
  const currentGlow = getGlowColor();

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      
      {/* JARVIS Arc Reactor Interface Container */}
      <div className="relative w-[320px] h-[320px] flex items-center justify-center">
        
        {/* Glow Background */}
        <motion.div 
          animate={{ opacity: isSpeaking || isThinking ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1] }}
          transition={{ repeat: Infinity, duration: isSpeaking ? 0.5 : 2 }}
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${currentGlow} 0%, transparent 60%)` }}
        />

        {/* 1. Outermost Faint Tick Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
          className="absolute inset-[0px] rounded-full border border-primary/20 pointer-events-none"
          style={{ borderStyle: 'dashed', borderWidth: '1px' }}
        />

        {/* 2. Outer Rotating Segmented Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          className="absolute inset-[15px] rounded-full border-t-2 border-r-2 border-primary/40 pointer-events-none"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="absolute inset-[22px] rounded-full border-b-2 border-l-2 border-primary/30 pointer-events-none opacity-50"
        />

        {/* 3. Middle Thick Arc Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
          className="absolute inset-[40px] rounded-full border-[6px] border-primary/5 border-t-primary/50 border-b-primary/50 pointer-events-none"
          style={{ filter: 'drop-shadow(0 0 10px rgba(0,243,255,0.3))' }}
        />

        {/* 4. Inner Dotted Ring / Data Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
          className="absolute inset-[65px] rounded-full border border-primary/60 pointer-events-none"
          style={{ borderStyle: 'dotted', borderWidth: '5px' }}
        />

        {/* 5. Innermost Housing Ring */}
        <div className="absolute inset-[85px] rounded-full border border-primary/20 bg-black/60 backdrop-blur-sm shadow-[inset_0_0_20px_rgba(0,243,255,0.1)]" />

        {/* Main Central Core (The Reacting Eye) */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.05, 1] : isThinking ? [1, 1.25, 1] : [1, 1.03, 1],
            rotate: isThinking ? [0, 90, 180, 270, 360] : 0,
          }}
          transition={{
            scale: { repeat: Infinity, duration: isSpeaking ? 0.4 : isListening ? 1.5 : isThinking ? 0.6 : 3, ease: "easeInOut" },
            rotate: { repeat: Infinity, duration: 1, ease: "linear" }
          }}
          className="absolute inset-[100px] rounded-full flex items-center justify-center border-2"
          style={{ 
             boxShadow: `0 0 40px ${currentGlow}, inset 0 0 20px ${currentGlow}`,
             borderColor: currentColor,
             background: 'rgba(0,0,0,0.8)'
          }}
        >
          {/* Sibling Core Light Base */}
          <motion.div 
            animate={{
              scale: isSpeaking ? [0.6, 1.2, 0.6] : isListening ? [0.85, 1.1, 0.85] : isThinking ? [0.5, 1.4, 0.5] : [0.9, 1.1, 0.9],
              opacity: isSpeaking ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5]
            }}
            transition={{
              repeat: Infinity,
              duration: isSpeaking ? 0.3 : isListening ? 1.2 : isThinking ? 0.3 : 2,
              ease: "easeInOut"
            }}
            className="w-full h-full rounded-full absolute"
            style={{
              background: `radial-gradient(circle, ${currentColor} 0%, transparent 60%)`
            }}
          />
        </motion.div>

        {/* Thinking Overlay (Pulsing triangles / segments) */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              key="thinking-overlay"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ rotate: { repeat: Infinity, duration: 2, ease: "linear" } }}
              className="absolute inset-[30px] rounded-full border-[3px] border-transparent border-t-yellow-400/70 border-b-yellow-400/70 pointer-events-none"
              style={{ filter: 'blur(2px)' }}
            />
          )}

          {/* Listening Overlay (Radar sweeps) */}
          {isListening && (
            <motion.div
              key="listening-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 1.4] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute inset-[-10px] rounded-full border border-red-500/40 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* HUD Crosshairs */}
        <div className="absolute top-[-20px] bottom-[-20px] left-1/2 w-[1px] bg-gradient-to-b from-transparent via-primary/30 to-transparent pointer-events-none" />
        <div className="absolute left-[-20px] right-[-20px] top-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
        
        {/* Corner Brackets for HUD feel */}
        <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-primary/40 rounded-tl" />
        <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-primary/40 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-primary/40 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-primary/40 rounded-br" />
      </div>

    </div>
  );
};
