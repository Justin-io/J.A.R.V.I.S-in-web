import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Wifi, HardDrive, Cpu } from 'lucide-react';

export const StatusGrid: React.FC = () => {
  const [uplink, setUplink] = useState('SECURE');
  const [memory, setMemory] = useState('0.0 MB');
  const [temp, setTemp] = useState(42.5);
  const [latency, setLatency] = useState(24);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let currentTemp = 42.5;
    let currentLatency = 24;

    const updateMetrics = () => {
      // 1. Uplink / Network connection data
      const onlineStatus = navigator.onLine;
      setIsOnline(onlineStatus);
      
      const conn = (navigator as any).connection;
      if (conn && conn.downlink) {
        setUplink(`${conn.downlink} Mbps`);
      } else {
        setUplink(onlineStatus ? 'SECURE' : 'OFFLINE');
      }

      // 2. Real memory parsing (Supported on Chromium browsers)
      const mem = (performance as any).memory;
      if (mem && mem.usedJSHeapSize) {
        setMemory(`${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB`);
      } else {
        // Fallback to logical processors or device RAM wrapper
        const deviceMemory = (navigator as any).deviceMemory;
        setMemory(`${deviceMemory ? deviceMemory + ' GB RAM' : navigator.hardwareConcurrency + ' CORES'}`);
      }

      // 3. Pseudo-Random Walk for Core Temperature (simulates natural CPU load heat rising/falling between 38C and 49C)
      const tempDelta = (Math.random() - 0.5) * 1.8;
      currentTemp = Math.max(38.0, Math.min(49.0, currentTemp + tempDelta));
      setTemp(currentTemp);

      // 4. Pseudo-Random Walk for AI Link Latency (ping in ms)
      const latDelta = Math.floor((Math.random() - 0.5) * 12);
      currentLatency = Math.max(14, Math.min(180, currentLatency + latDelta));
      setLatency(currentLatency);
    };

    updateMetrics(); // Initial fetch
    
    // Refresh interval for realistic live-data feel
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { 
      label: 'AI_LINK', 
      value: isOnline ? `${latency}ms` : 'ERR_HOST', 
      icon: Shield, 
      color: !isOnline ? 'text-red-500' : latency > 100 ? 'text-yellow-400' : 'text-primary' 
    },
    { 
      label: 'UPLINK', 
      value: uplink, 
      icon: Wifi, 
      color: isOnline ? 'text-primary' : 'text-red-500' 
    },
    { 
      label: 'CORE_TEMP', 
      value: `${temp.toFixed(1)}°C`, 
      icon: Cpu, 
      color: temp > 46 ? 'text-red-400' : 'text-blue-400' 
    },
    { 
      label: 'MEMORY', 
      value: memory, 
      icon: HardDrive, 
      color: 'text-primary/60' 
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((m, i) => {
        // Automatically extract tailwind color to use for the glowing indicator pip
        const pingColorClass = m.color.replace('text-', 'bg-').split('/')[0];
        
        return (
          <motion.div 
            key={m.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="well-depth p-2 flex flex-col gap-1 overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <m.icon className={`w-3 h-3 ${m.color}`} />
              <div className={`w-1 h-1 rounded-full animate-pulse ${pingColorClass}`}></div>
            </div>
            <p className="text-[7px] tracking-[0.2em] text-white/30 uppercase">{m.label}</p>
            <p className={`text-[10px] font-black tracking-widest uppercase ${m.color}`}>
              {m.value}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};
