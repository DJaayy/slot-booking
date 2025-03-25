import { useState } from "react";
import { useLocation } from "wouter";
import { format, addDays, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import WeeklySlots from "@/components/WeeklySlots";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDeploymentSlots } from "@/hooks/useDeploymentSlots";
import BookingModal from "@/components/BookingModal";
import SlotDetailsModal from "@/components/SlotDetailsModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { SlotWithRelease } from "@shared/schema";

export default function Home() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<SlotWithRelease | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  
  const { data: slotsByDay, isLoading, refetch } = useDeploymentSlots(currentWeek);
  
  const openBookingModal = (slot: SlotWithRelease) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };
  
  const openDetailsModal = (slot: SlotWithRelease) => {
    setSelectedSlot(slot);
    setShowDetailsModal(true);
  };
  
  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
  };
  
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
  };
  
  const openConfirmationModal = () => {
    setShowDetailsModal(false);
    setShowConfirmationModal(true);
  };
  
  const closeConfirmationModal = () => {
    setShowConfirmationModal(false);
    setSelectedSlot(null);
  };
  
  const handleBookingSuccess = () => {
    refetch();
    toast({
      title: "Success",
      description: "Slot booked successfully!",
      variant: "default",
    });
  };
  
  const handleCancelSuccess = () => {
    refetch();
    setShowConfirmationModal(false);
    setSelectedSlot(null);
    toast({
      title: "Success",
      description: "Booking canceled successfully!",
      variant: "default",
    });
  };
  
  const handleStatusUpdateSuccess = () => {
    refetch();
    closeDetailsModal();
    toast({
      title: "Success",
      description: "Release status updated successfully!",
      variant: "default",
    });
  };

  const previousWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const nextWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4); // Show Monday to Friday
  const dateRangeString = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">
          Deployment Slots: <span>{dateRangeString}</span>
        </h2>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={previousWeek}
            title="Previous Week"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={nextWeek}
            title="Next Week"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button 
            variant="default"
            onClick={goToCurrentWeek}
            className="flex items-center gap-1"
          >
            <CalendarDays className="h-4 w-4" />
            <span>Today</span>
          </Button>
        </div>
      </div>

      <WeeklySlots 
        slotsByDay={slotsByDay}
        isLoading={isLoading}
        onBookSlot={openBookingModal}
        onViewSlot={openDetailsModal}
        currentWeek={currentWeek}
      />

      <div className="flex justify-end mt-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            <span className="text-sm text-slate-600">Available</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            <span className="text-sm text-slate-600">Booked</span>
          </div>
        </div>
      </div>

      {selectedSlot && (
        <>
          <BookingModal
            isOpen={showBookingModal}
            onClose={closeBookingModal}
            slot={selectedSlot}
            onSuccess={handleBookingSuccess}
          />
          
          <SlotDetailsModal
            isOpen={showDetailsModal}
            onClose={closeDetailsModal}
            slot={selectedSlot}
            onCancelBooking={openConfirmationModal}
            onStatusUpdate={handleStatusUpdateSuccess}
          />
          
          <ConfirmationModal
            isOpen={showConfirmationModal}
            onClose={closeConfirmationModal}
            onConfirm={handleCancelSuccess}
            slot={selectedSlot}
          />
        </>
      )}
    </div>
  );
}
