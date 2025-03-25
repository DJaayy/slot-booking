import { format } from "date-fns";
import { SlotWithRelease } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SlotDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: SlotWithRelease;
  onCancelBooking: () => void;
}

export default function SlotDetailsModal({ isOpen, onClose, slot, onCancelBooking }: SlotDetailsModalProps) {
  // Check if the slot has a release
  if (!slot.release) {
    return null;
  }

  // Format date for display
  const formattedDate = slot.date instanceof Date
    ? format(slot.date, "EEEE, MMMM d, yyyy")
    : format(new Date(slot.date), "EEEE, MMMM d, yyyy");

  // Helper to get badge color based on release type
  const getReleaseTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      feature: "bg-blue-100 text-blue-800",
      enhancement: "bg-green-100 text-green-800",
      bugfix: "bg-red-100 text-red-800",
      migration: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800",
    };
    return types[type.toLowerCase()] || types.other;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deployment Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="font-medium text-gray-800">{formattedDate}</p>
            <p className="text-gray-600">{slot.time}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Release</p>
            <p className="font-medium text-gray-800">{slot.release.name}</p>
            {slot.release.version && (
              <p className="text-sm text-gray-600">{slot.release.version}</p>
            )}
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Team</p>
            <p className="text-gray-800">{slot.release.team}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Type</p>
            <Badge className={getReleaseTypeBadge(slot.release.releaseType)} variant="outline">
              {slot.release.releaseType}
            </Badge>
          </div>
          
          {slot.release.description && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <p className="text-gray-800 text-sm">
                {slot.release.description}
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={onCancelBooking}
          >
            Cancel Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
