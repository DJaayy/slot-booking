import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SlotWithRelease } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  slot: SlotWithRelease;
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, slot }: ConfirmationModalProps) {
  // Check if the slot has a release
  if (!slot.release) {
    return null;
  }

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async () => {
      const options: RequestInit = {
        method: "DELETE",
      };
      return await apiRequest(`/api/releases/${slot.release?.id}`, options);
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/releases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      onConfirm();
    },
    onError: (error) => {
      console.error("Error canceling booking:", error);
    },
  });

  const handleConfirm = () => {
    cancelBookingMutation.mutate();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader className="flex flex-col items-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-2" />
          <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this deployment booking? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>No, Keep It</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
            disabled={cancelBookingMutation.isPending}
          >
            {cancelBookingMutation.isPending ? "Canceling..." : "Yes, Cancel Booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
