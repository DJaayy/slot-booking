
import { Release } from "@shared/schema";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, SkipForward } from "lucide-react";
import { motion } from "framer-motion";

type StatusTimelineProps = {
  status: Release["status"];
  comments?: string | null;
};

const statuses = [
  { value: "pending", icon: Clock, label: "Pending" },
  { value: "released", icon: CheckCircle, label: "Released" },
  { value: "reverted", icon: XCircle, label: "Reverted" },
  { value: "skipped", icon: SkipForward, label: "Skipped" },
];

export default function StatusTimeline({ status, comments }: StatusTimelineProps) {
  const currentIndex = statuses.findIndex(s => s.value === status);

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 h-full w-0.5 bg-gray-200" />
        
        {/* Status points */}
        <div className="relative space-y-6">
          {statuses.map((s, i) => {
            const Icon = s.icon;
            const isActive = i <= currentIndex;
            const isCurrent = s.value === status;
            
            return (
              <motion.div
                key={s.value}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.2 : 1,
                    transition: { duration: 0.2 }
                  }}
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2",
                    isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                  )}
                >
                  <Icon className={cn(
                    "h-6 w-6",
                    isActive ? "text-blue-500" : "text-gray-400"
                  )} />
                </motion.div>
                <div>
                  <p className={cn(
                    "font-medium",
                    isActive ? "text-blue-500" : "text-gray-400"
                  )}>
                    {s.label}
                  </p>
                  {isCurrent && comments && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-gray-500"
                    >
                      {comments}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
