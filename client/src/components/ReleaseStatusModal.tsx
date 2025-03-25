import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Release } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReleaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: Release & { 
    slot?: { 
      date: Date | string; 
      time: string; 
      timeDetail?: string | null 
    } 
  };
  onSuccess: () => void;
}

type ReleaseStatus = "released" | "reverted" | "skipped" | "unbooked";

export default function ReleaseStatusModal({ isOpen, onClose, release, onSuccess }: ReleaseStatusModalProps) {
  const [status, setStatus] = useState<ReleaseStatus>("released");
  const [comments, setComments] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await apiRequest(
        "PATCH", 
        `/api/releases/${release.id}/status`, 
        { status, comments: comments || null }
      );
      
      toast({
        title: "Status updated",
        description: `The release status has been updated to ${status}.`,
        variant: "default",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update release status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form when modal opens
  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      setStatus("released");
      setComments("");
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Update Release Status</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <h3 className="font-medium text-lg">Release Details</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>
                  <p>{release.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Version:</span>
                  <p>{release.version || "-"}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Team:</span>
                  <p>{release.team}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Type:</span>
                  <p>{release.releaseType}</p>
                </div>
                {release.slot && (
                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">Scheduled:</span>
                    <p>
                      {new Date(release.slot.date).toLocaleDateString()} - {release.slot.time}
                      {release.slot.timeDetail && ` (${release.slot.timeDetail})`}
                    </p>
                  </div>
                )}
                {release.description && (
                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">Description:</span>
                    <p>{release.description}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-base font-medium">Status</Label>
              <RadioGroup 
                id="status" 
                value={status} 
                onValueChange={(value) => setStatus(value as ReleaseStatus)}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="released" id="released" />
                  <Label htmlFor="released">Released</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reverted" id="reverted" />
                  <Label htmlFor="reverted">Reverted</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skipped" id="skipped" />
                  <Label htmlFor="skipped">Skipped</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unbooked" id="unbooked" />
                  <Label htmlFor="unbooked">Unbooked</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-base font-medium">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Add any relevant comments about this status change..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}