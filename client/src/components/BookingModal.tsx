import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { z } from "zod";
import { SlotWithRelease } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: SlotWithRelease;
  onSuccess: () => void;
}

const formSchema = z.object({
  releaseName: z.string().min(1, "Release name is required"),
  version: z.string().optional(),
  team: z.string().min(1, "Team is required"),
  releaseType: z.string().min(1, "Release type is required"),
  description: z.string().optional(),
});

export default function BookingModal({ isOpen, onClose, slot, onSuccess }: BookingModalProps) {
  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      releaseName: "",
      version: "",
      team: "",
      releaseType: "",
      description: "",
    },
  });

  // Format date for display
  const formattedDate = slot.date instanceof Date
    ? format(slot.date, "EEEE, MMMM d, yyyy")
    : format(new Date(slot.date), "EEEE, MMMM d, yyyy");

  // Booking mutation
  const bookSlotMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/slots/book", {
        slotId: slot.id,
        ...values,
      });
    },
    onSuccess: () => {
      onClose();
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      console.error("Error booking slot:", error);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    bookSlotMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Deployment Slot</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-gray-500 mb-2">You are booking:</p>
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="font-medium text-gray-800">{formattedDate}</p>
            <p className="text-gray-600">{slot.time}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="releaseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. API Gateway Update" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. v1.2.3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="team"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Backend Team">Backend Team</SelectItem>
                      <SelectItem value="Frontend Team">Frontend Team</SelectItem>
                      <SelectItem value="Data Team">Data Team</SelectItem>
                      <SelectItem value="Security Team">Security Team</SelectItem>
                      <SelectItem value="Finance Team">Finance Team</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releaseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="enhancement">Enhancement</SelectItem>
                      <SelectItem value="bugfix">Bug Fix</SelectItem>
                      <SelectItem value="migration">Migration</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the deployment..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={bookSlotMutation.isPending}
              >
                {bookSlotMutation.isPending ? "Booking..." : "Book Slot"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
