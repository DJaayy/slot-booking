import { useQuery } from "@tanstack/react-query";
import { SlotWithRelease } from "@shared/schema";
import { format } from "date-fns";

export function useDeploymentSlots(date: Date) {
  const formattedDate = format(date, "yyyy-MM-dd");
  
  return useQuery<Record<string, SlotWithRelease[]>>({
    queryKey: ['/api/slots', formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/slots?date=${formattedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch slots');
      }
      return response.json();
    },
    staleTime: 0, // Always refetch when needed
  });
}
