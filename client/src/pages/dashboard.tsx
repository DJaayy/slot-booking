import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Release } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ReleaseWithSlot = Release & {
  slot?: {
    date: Date | string;
    time: string;
  };
};

type StatisticsData = {
  stats: {
    total: number;
    thisWeek: number;
    nextWeek: number;
    available: number;
  };
  byType: Record<string, number>;
  byTeam: Record<string, number>;
};

export default function Dashboard() {
  const { toast } = useToast();

  // Fetch releases
  const { data: releases, isLoading: releasesLoading } = useQuery<ReleaseWithSlot[]>({
    queryKey: ["/api/releases"],
  });

  // Fetch statistics
  const { data: statistics, isLoading: statsLoading } = useQuery<StatisticsData>({
    queryKey: ["/api/stats"],
  });

  // Helper to format date and time
  const formatDateTime = (release: ReleaseWithSlot) => {
    if (!release.slot) return "N/A";
    
    try {
      const date = typeof release.slot.date === 'string' 
        ? parseISO(release.slot.date) 
        : release.slot.date;
      
      return `${format(date, "MMM d")}, ${release.slot.time}`;
    } catch (error) {
      return "Invalid date";
    }
  };

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

  // Helper to get badge color based on status
  const getStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      canceled: "bg-red-100 text-red-800",
    };
    return statuses[status.toLowerCase()] || statuses.pending;
  };

  // Colors for charts
  const typeColors: Record<string, string> = {
    feature: "bg-blue-500",
    enhancement: "bg-green-500",
    bugfix: "bg-red-500",
    migration: "bg-purple-500",
    other: "bg-gray-500",
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-6">Upcoming Releases</h2>

      <Card className="mb-6 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releasesLoading ? (
                  Array(3).fill(0).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : releases && releases.length > 0 ? (
                  releases.map(release => (
                    <TableRow key={release.id}>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(release)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">{release.name}</div>
                        {release.version && (
                          <div className="text-sm text-gray-500">{release.version}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{release.team}</TableCell>
                      <TableCell>
                        <Badge className={getReleaseTypeBadge(release.releaseType)} variant="outline">
                          {release.releaseType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(release.status)} variant="outline">
                          {release.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                      No upcoming releases found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Deployment Summary Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Deployment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {Array(4).fill(0).map((_, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            ) : statistics ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Upcoming</span>
                  <span className="text-sm font-medium">{statistics.stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">This Week</span>
                  <span className="text-sm font-medium">{statistics.stats.thisWeek}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Next Week</span>
                  <span className="text-sm font-medium">{statistics.stats.nextWeek}</span>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Available Slots</span>
                  <span className="text-sm font-medium text-green-600">{statistics.stats.available}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Deployment by Type Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Deployment by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {Array(4).fill(0).map((_, index) => (
                  <div key={index} className="flex items-center">
                    <Skeleton className="h-3 w-3 rounded-full mr-2" />
                    <Skeleton className="h-4 w-24 flex-1 mr-2" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            ) : statistics && statistics.byType ? (
              <div className="space-y-3">
                {Object.entries(statistics.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full ${typeColors[type.toLowerCase()] || typeColors.other} mr-2`}></span>
                    <span className="text-sm text-slate-600 flex-1">{type}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(statistics.byType).length === 0 && (
                  <div className="text-center py-4 text-gray-500">No release types available</div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Team Activity Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Team Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, index) => (
                  <div key={index} className="flex items-center">
                    <Skeleton className="h-4 w-24 flex-1 mr-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : statistics && statistics.byTeam ? (
              <div className="space-y-3">
                {Object.entries(statistics.byTeam).map(([team, count]) => (
                  <div key={team} className="flex items-center">
                    <span className="text-sm text-slate-600 flex-1">{team}</span>
                    <span className="text-sm font-medium">{count} {count === 1 ? 'slot' : 'slots'}</span>
                  </div>
                ))}
                {Object.keys(statistics.byTeam).length === 0 && (
                  <div className="text-center py-4 text-gray-500">No team activity available</div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
