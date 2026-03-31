import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { HudPanel, HudButton } from './ui/HudElements';
import { Key, ShieldAlert } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { motion } from 'framer-motion';

export const AuthScreen: React.FC = () => {
  const { loginWithPassword } = useAuthStore();
  const { initAudio } = useVoice();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      initAudio();
      const success = await loginWithPassword(password);
      if (!success) {
        throw new Error('INVALID CLEARANCE CODE');
      }
    } catch (err: any) {
      setError(err.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-grid-pattern bg-[size:30px_30px]"></div>
      
      <HudPanel title="SYSTEM ACCESS" className="w-full max-w-sm relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-primary/20 bg-primary/5 rounded-full mb-4">
            <ShieldAlert className="w-8 h-8 text-primary/60 animate-pulse" />
          </div>
          <p className="text-[10px] text-primary/40 tracking-[0.3em] uppercase">Identity Verification Required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <Key className="absolute left-3 top-3 w-4 h-4 text-primary/50 group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                placeholder="ENTER SECURITY KEY"
                className="w-full bg-black/60 border border-primary/30 p-3 pl-10 text-primary text-xs tracking-[0.4em] focus:border-primary outline-none transition-all placeholder:text-primary/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-red-500 text-[10px] tracking-[0.2em] text-center uppercase font-bold bg-red-500/10 py-2 border border-red-500/20"
            >
              ACCESS DENIED: {error}
            </motion.div>
          )}

          <HudButton type="submit" className="w-full py-4 text-sm" disabled={loading}>
            {loading ? "AUTHENTICATING..." : "REQUEST ACCESS"}
          </HudButton>

          <p className="text-[8px] text-center text-primary/30 tracking-widest uppercase mt-4">
            Authorized Personnel Only
          </p>
        </form>
      </HudPanel>
    </div>
  );
};
