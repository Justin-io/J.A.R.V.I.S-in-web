import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useMemoryStore } from '../../store/memoryStore';
import { HudPanel } from '../ui/HudElements';
import { BrainCircuit, Edit2, Plus, Check, X, Trash2 } from 'lucide-react';

export const MemoryWidget: React.FC = () => {
  const { user } = useAuthStore();
  const { memories, addMemory, updateMemory, removeMemory } = useMemoryStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const submitEdit = (id: string) => {
    if (editVal.trim()) {
      updateMemory(id, editVal.trim());
    }
    setEditingId(null);
  };

  const submitAdd = () => {
    if (newVal.trim() && user) {
      addMemory(newVal.trim(), user.id);
      setNewVal('');
    }
    setIsAdding(false);
  };

  return (
    <HudPanel title="CORE MEMORIES" className="h-[250px] flex flex-col relative w-full overflow-hidden">
      
      {/* Header controls */}
      <div className="absolute top-2 right-2 z-20 flex gap-2">
        {memories.length > 0 && !isAdding && !isConfirmingClear && (
          <button 
            onClick={() => setIsConfirmingClear(true)} 
            className="p-1 border border-red-500/30 bg-red-500/5 hover:bg-red-500/20 hover:border-red-500/60 rounded-sm text-red-500 transition-colors text-[8px] flex items-center gap-1 font-bold"
          >
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
        )}
        {!isAdding && !isConfirmingClear && (
          <button onClick={() => setIsAdding(true)} className="p-1 border border-primary/20 bg-primary/5 hover:bg-primary/20 hover:border-primary/50 rounded-sm text-primary transition-colors text-[8px] flex items-center gap-1 font-bold">
            <Plus className="w-3 h-3" /> ADD
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar mt-1">
        {/* Clear All Confirmation */}
        {isConfirmingClear && (
          <div className="p-3 border border-red-500/50 bg-red-500/10 rounded-sm space-y-3 mt-4 animate-pulse">
            <p className="text-[10px] text-red-400 font-bold text-center tracking-tighter uppercase">
              CRITICAL: PROCEED WITH CORE SYSTEM WIPE?
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setIsConfirmingClear(false)} 
                className="flex-1 p-2 bg-primary/10 border border-primary/20 text-primary text-[9px] hover:bg-primary/20 font-bold py-1"
              >
                ABORT
              </button>
              <button 
                onClick={() => { useMemoryStore.getState().clearMemories(user?.id || ''); setIsConfirmingClear(false); }} 
                className="flex-1 p-2 bg-red-600/30 border border-red-600/60 text-red-100 text-[9px] hover:bg-red-600/50 font-black py-1"
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        )}

        {/* Add new memory field */}
        {isAdding && (
          <div className="p-2 border border-primary/40 bg-primary/10 rounded-sm space-y-2 mt-4 shadow-[0_0_15px_rgba(0,243,255,0.1)]">
            <textarea
              autoFocus
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              className="w-full bg-black/60 border border-primary/30 p-2 text-[10px] text-primary outline-none custom-scrollbar min-h-[50px] resize-none focus:border-primary/60 transition-colors"
              placeholder="Type fact manually..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitAdd())}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAdding(false)} className="p-1.5 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 rounded-sm transition-colors">
                <X className="w-3 h-3" />
              </button>
              <button onClick={submitAdd} className="p-1.5 bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 rounded-sm transition-colors">
                <Check className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {memories.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center h-full text-primary/40 text-[10px] space-y-2 py-10 mt-2">
            <BrainCircuit className="w-8 h-8 opacity-20" />
            <p>NO CORE FACTS STORED</p>
          </div>
        ) : (
          memories.map((m, i) => (
            <div key={m.id || `mem-${i}`} className={`group p-2 border-l-2 bg-primary/5 rounded-r-sm relative transition-all ${editingId === m.id ? 'border-primary shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 'border-primary/30 hover:border-primary/60 hover:bg-primary/10'}`}>
              {editingId === m.id ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="w-full bg-black/80 border border-primary/50 p-2 text-[10px] text-primary outline-none custom-scrollbar min-h-[50px] resize-none"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitEdit(m.id))}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 rounded-sm transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                    <button onClick={() => submitEdit(m.id)} className="p-1.5 bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 rounded-sm transition-colors">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pr-12">
                  <p className="text-[10px] font-mono leading-relaxed text-primary/90 whitespace-pre-wrap">{m.fact}</p>
                  <p className="text-[7px] text-primary/30 mt-1.5 uppercase tracking-widest flex items-center gap-1">
                    <BrainCircuit className="w-2 h-2" /> 
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'JUST NOW'}
                  </p>
                  
                  {/* Floating Action Buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button onClick={() => { if (m.id) { setEditingId(m.id); setEditVal(m.fact); } }} className="p-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded-sm transition-colors">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {m.id && deletingId === m.id ? (
                      <div className="flex gap-1 animate-in slide-in-from-right-2">
                        <button onClick={() => setDeletingId(null)} className="p-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-sm">
                          <X className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeMemory(m.id)} className="p-1.5 bg-red-600/40 border border-red-600/60 text-white hover:bg-red-600/60 rounded-sm">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => m.id && setDeletingId(m.id)} className="p-1.5 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 rounded-sm transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </HudPanel>
  );
};
