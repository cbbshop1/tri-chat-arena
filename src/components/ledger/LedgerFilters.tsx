import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

interface LedgerFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  agentFilter: string;
  setAgentFilter: (agent: string) => void;
  availableAgents: string[];
}

export function LedgerFilters({ 
  searchTerm, 
  setSearchTerm, 
  typeFilter, 
  setTypeFilter,
  agentFilter,
  setAgentFilter,
  availableAgents 
}: LedgerFiltersProps) {
  const activeFilters = [
    ...(typeFilter !== "all" ? [{ key: "type", value: typeFilter }] : []),
    ...(agentFilter !== "all" ? [{ key: "agent", value: agentFilter }] : []),
    ...(searchTerm ? [{ key: "search", value: searchTerm }] : [])
  ];

  const clearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setAgentFilter("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memory content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input/50 font-mono"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-input/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="memory">Memory</SelectItem>
              <SelectItem value="context">Context</SelectItem>
              <SelectItem value="experience">Experience</SelectItem>
              <SelectItem value="consolidation">Consolidation</SelectItem>
              <SelectItem value="anchor_memory">Anchor Memory</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[140px] bg-input/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {availableAgents.map(agent => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="text-xs font-mono">
              {filter.key}: {filter.value}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
