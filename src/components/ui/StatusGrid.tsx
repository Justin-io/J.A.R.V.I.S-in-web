import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Wifi, HardDrive, Cpu } from 'lucide-react';

export const StatusGrid: React.FC = () => {
  const metrics = [
    { label: 'AI_LINK', value: 'NOMINAL', icon: Shield, color: 'text-primary' },
    { label: 'UPLINK', value: 'SECURE', icon: Wifi, color: 'text-primary' },
    { label: 'CORE_TEMP', value: '42°C', icon: Cpu, color: 'text-blue-400' },
    { label: 'MEMORY', value: '1.2TB', icon: HardDrive, color: 'text-primary/60' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((m, i) => (
        <motion.div 
          key={m.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="well-depth p-2 flex flex-col gap-1 overflow-hidden group hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <m.icon className={`w-3 h-3 ${m.color}`} />
            <div className="w-1 h-1 bg-primary/40 rounded-full animate-pulse"></div>
          </div>
          <p className="text-[7px] tracking-[0.2em] text-white/30 uppercase">{m.label}</p>
          <p className={`text-[10px] font-black tracking-widest uppercase ${m.color}`}>{m.value}</p>
        </motion.div>
      ))}
    </div>
  );
};
