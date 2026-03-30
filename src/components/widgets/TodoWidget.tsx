import React, { useEffect } from 'react';
import { useTodoStore } from '../../store/todoStore';
import { HudPanel } from '../ui/HudElements';
import { CheckSquare, Square, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export const TodoWidget: React.FC<{ userId: string }> = ({ userId }) => {
  const { tasks, fetchTasks, updateTask, deleteTask, loading } = useTodoStore();

  useEffect(() => {
    fetchTasks(userId);
  }, [userId, fetchTasks]);

  if (loading && tasks.length === 0) {
    return (
      <HudPanel title="TASK PRIORITY" className="h-[250px] animate-pulse">
        <div className="flex items-center justify-center h-full">SYNCING...</div>
      </HudPanel>
    );
  }

  return (
    <HudPanel title="TASK PRIORITY" className="h-[250px] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-primary/40 text-[10px] space-y-2">
            <CheckSquare className="w-8 h-8 opacity-20" />
            <p>NO ACTIVE PROTOCOLS</p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <div 
              key={task.id || `task-${i}`}
              className={`
                group flex items-start gap-2 p-2 border border-primary/10 rounded-sm hover:border-primary/30 transition-all
                ${task.status === 'completed' ? 'opacity-50' : ''}
              `}
            >
              <button 
                onClick={() => updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })}
                className="mt-0.5 text-primary/50 hover:text-primary transition-colors"
              >
                {task.status === 'completed' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold truncate ${task.status === 'completed' ? 'line-through' : ''}`}>
                  {task.title}
                </p>
                {task.due_date && (
                   <div className="flex items-center gap-1 mt-1 text-[8px] text-primary/60">
                     <Clock className="w-2.5 h-2.5" />
                     {format(new Date(task.due_date), 'MMM dd, HH:mm')}
                   </div>
                )}
              </div>

              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </HudPanel>
  );
};
