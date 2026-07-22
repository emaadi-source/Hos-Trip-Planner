import type { Stop } from '@workspace/api-client-react';
import { MapPin, Package, Truck, Coffee, Fuel, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const getStopIcon = (type: Stop['type']) => {
  switch (type) {
    case 'start':
      return MapPin;
    case 'pickup':
      return Package;
    case 'dropoff':
      return Package;
    case 'rest':
      return Coffee;
    case 'fuel':
      return Fuel;
    case 'break':
      return Clock;
    default:
      return MapPin;
  }
};

const getStopColor = (type: Stop['type']) => {
  switch (type) {
    case 'start':
      return 'text-gray-600 bg-gray-100';
    case 'pickup':
      return 'text-blue-600 bg-blue-100';
    case 'dropoff':
      return 'text-green-600 bg-green-100';
    case 'rest':
      return 'text-orange-600 bg-orange-100';
    case 'fuel':
      return 'text-yellow-600 bg-yellow-100';
    case 'break':
      return 'text-purple-600 bg-purple-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

interface StopsListProps {
  stops: Stop[];
}

export function StopsList({ stops }: StopsListProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {stops.map((stop, idx) => {
          const Icon = getStopIcon(stop.type);
          const colorClass = getStopColor(stop.type);

          return (
            <div
              key={idx}
              className="flex gap-3 pb-3 border-b last:border-0"
              data-testid={`stop-${idx}`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${colorClass} flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold capitalize">{stop.type}</span>
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    Day {stop.arrivalDay} · {stop.arrivalHour.toFixed(1)}h
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{stop.location}</p>
                <div className="flex gap-4 text-xs">
                  <span className="font-mono">
                    <span className="text-muted-foreground">Duration:</span> {stop.durationHours.toFixed(1)}h
                  </span>
                  <span className="font-mono">
                    <span className="text-muted-foreground">Miles:</span> {stop.cumulativeMiles.toFixed(1)}
                  </span>
                </div>
                {stop.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{stop.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
