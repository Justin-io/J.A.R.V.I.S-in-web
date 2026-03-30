import React, { useEffect } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { HudPanel } from '../ui/HudElements';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export const CalendarWidget: React.FC<{ userId: string }> = ({ userId }) => {
  const { events, fetchEvents } = useCalendarStore();

  useEffect(() => {
    fetchEvents(userId);
  }, [userId, fetchEvents]);

  return (
    <HudPanel title="CALENDAR FEED" className="h-[250px] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-primary/40 text-[10px] space-y-2">
            <CalendarIcon className="w-8 h-8 opacity-20" />
            <p>NO EVENTS SCHEDULED FOR SIR</p>
          </div>
        ) : (
          events.map((event) => (
            <div 
              key={event.id}
              className="p-2 border-l-2 border-primary/30 bg-primary/5 rounded-r-sm space-y-1"
            >
              <p className="text-[10px] font-bold">{event.title}</p>
              <div className="flex items-center gap-2 text-[8px] text-primary/60">
                <Clock className="w-2.5 h-2.5" />
                <span>
                  {(() => {
                    try {
                      return format(new Date(event.start_time), 'HH:mm');
                    } catch (e) {
                      return event.start_time; // Fallback to raw string if parsing fails
                    }
                  })()}
                </span>
                {event.location && (
                  <>
                    <MapPin className="w-2.5 h-2.5 ml-1" />
                    <span className="truncate">{event.location}</span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </HudPanel>
  );
};
