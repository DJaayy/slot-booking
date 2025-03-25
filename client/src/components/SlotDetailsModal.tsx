import { format } from "date-fns";
import { useState } from "react";
import { SlotWithRelease } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReleaseStatusModal from "./ReleaseStatusModal";

interface SlotDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: SlotWithRelease;
  onCancelBooking: () => void;
  onStatusUpdate?: () => void;
}

export default function SlotDetailsModal({ isOpen, onClose, slot, onCancelBooking, onStatusUpdate }: SlotDetailsModalProps) {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
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
  
  // Helper to get status badge color
  const getStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      released: "bg-green-100 text-green-800",
      reverted: "bg-red-100 text-red-800",
      skipped: "bg-gray-100 text-gray-800",
      unbooked: "bg-purple-100 text-purple-800",
    };
    return statuses[status.toLowerCase()] || statuses.pending;
  };
  
  const handleStatusUpdate = () => {
    setIsStatusModalOpen(true);
  };
  
  const handleStatusSuccess = () => {
    if (onStatusUpdate) {
      onStatusUpdate();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deployment Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="font-medium text-gray-800">{formattedDate}</p>
              <p className="text-gray-600">{slot.timeDetail || slot.time}</p>
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
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <Badge className={getStatusBadge(slot.release.status)} variant="outline">
                {slot.release.status.charAt(0).toUpperCase() + slot.release.status.slice(1)}
              </Badge>
              {slot.release.comments && (
                <p className="text-gray-600 text-sm mt-1">
                  <span className="font-medium">Comments:</span> {slot.release.comments}
                </p>
              )}
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
          
          <DialogFooter className="sm:justify-start sm:space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              type="button" 
              variant="default"
              onClick={handleStatusUpdate}
            >
              Update Status
            </Button>
            <div className="flex-1"></div>
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
      
      {isStatusModalOpen && (
        <ReleaseStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          release={slot.release!}
          onSuccess={handleStatusSuccess}
        />
      )}
    </>
  );
}
