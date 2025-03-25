import { useQuery } from "@tanstack/react-query";
import { SlotWithRelease } from "@shared/schema";
import { format } from "date-fns";

export function useDeploymentSlots(date: Date) {
  const formattedDate = format(date, "yyyy-MM-dd");
  
  return useQuery<Record<string, SlotWithRelease[]>>({
    queryKey: [`/api/slots?date=${formattedDate}`],
  });
}
