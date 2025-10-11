import { Card } from "@/components/ui/card";
import { Database, Clock, Users, TrendingUp } from "lucide-react";

interface LedgerStatsProps {
  totalEntries: number;
  totalAgents: number;
  totalSize: number;
  lastEntry?: string;
}

export function LedgerStats({ totalEntries, totalAgents, totalSize, lastEntry }: LedgerStatsProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const stats = [
    {
      icon: Database,
      label: "Total Entries",
      value: totalEntries.toLocaleString(),
      color: "text-green-400"
    },
    {
      icon: Users, 
      label: "Active Agents",
      value: totalAgents.toString(),
      color: "text-blue-400"
    },
    {
      icon: TrendingUp,
      label: "Total Size", 
      value: formatSize(totalSize),
      color: "text-amber-400"
    },
    {
      icon: Clock,
      label: "Last Entry",
      value: lastEntry ? new Date(lastEntry).toLocaleTimeString() : "None",
      color: "text-muted-foreground"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold font-mono ${stat.color} mt-1`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-2 rounded-md bg-muted/50 border border-border/50`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
