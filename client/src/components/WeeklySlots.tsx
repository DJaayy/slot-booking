import { SlotWithRelease } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays, startOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface WeeklySlotsProps {
  slotsByDay: Record<string, SlotWithRelease[]> | undefined;
  isLoading: boolean;
  onBookSlot: (slot: SlotWithRelease) => void;
  onViewSlot: (slot: SlotWithRelease) => void;
  currentWeek: Date;
}

export default function WeeklySlots({ 
  slotsByDay, 
  isLoading,
  onBookSlot,
  onViewSlot,
  currentWeek 
}: WeeklySlotsProps) {
  // Create array of weekdays (Monday to Friday)
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }).map((_, index) => {
    const date = addDays(weekStart, index);
    return {
      date,
      dateKey: format(date, "yyyy-MM-dd"),
      displayDate: format(date, "EEEE, MMMM d")
    };
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {weekDays.map((day) => (
          <Card key={day.dateKey} className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-medium text-slate-800 mb-2">
                <Skeleton className="h-5 w-32" />
              </h3>
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {weekDays.map((day) => {
        const daySlots = slotsByDay?.[day.dateKey] || [];
        
        return (
          <Card key={day.dateKey} className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-medium text-slate-800 mb-2">{day.displayDate}</h3>
              <div className="space-y-2">
                {daySlots.length > 0 ? (
                  daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`slot-card rounded-md p-3 cursor-pointer transition-all ${
                        slot.booked === 1
                          ? "bg-blue-50 border border-blue-200 hover:border-blue-300"
                          : "bg-slate-50 border border-slate-200 hover:border-primary"
                      }`}
                      onClick={() => slot.booked === 1 ? onViewSlot(slot) : onBookSlot(slot)}
                      title={slot.timeDetail || ""}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700">{slot.time}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            slot.booked === 1
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {slot.booked === 1 ? "Booked" : "Available"}
                        </span>
                      </div>
                      {slot.booked === 1 && slot.release && (
                        <>
                          <div className="text-xs text-slate-600 truncate">{slot.release.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{slot.release.team}</div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500">No slots available</div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
