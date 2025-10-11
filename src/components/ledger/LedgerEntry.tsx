import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, Hash, User, Brain, ChevronDown, ChevronRight, Shield, Link as LinkIcon } from "lucide-react";

interface LedgerEntryProps {
  id: string;
  timestamp: string;
  hash: string;
  agentId: string;
  type: "memory" | "context" | "experience" | "consolidation" | "anchor_memory";
  content: string;
  size: number;
  prevHash?: string;
  batchId?: string;
}

const typeColors: Record<string, string> = {
  memory: "text-blue-400",
  context: "text-green-400",
  experience: "text-amber-400",
  consolidation: "text-destructive",
  anchor_memory: "text-purple-400"
};

const typeIcons: Record<string, any> = {
  memory: Brain,
  context: User,
  experience: Hash,
  consolidation: Clock,
  anchor_memory: LinkIcon
};

export function LedgerEntry({ entry }: { entry: LedgerEntryProps }) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = typeIcons[entry.type] || Brain;
  const colorClass = typeColors[entry.type] || "text-foreground";
  
  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md bg-muted/50 border border-border/50`}>
            <Icon className={`h-4 w-4 ${colorClass}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">
                {entry.type.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                ID: {entry.id.slice(0, 8)}...
              </span>
              {entry.prevHash && (
                <Badge variant="secondary" className="text-xs">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Chained
                </Badge>
              )}
              {entry.batchId && (
                <Badge variant="default" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Batched
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {entry.hash.slice(0, 12)}...
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-green-400 font-mono">
            Agent: {entry.agentId}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {entry.size} bytes
          </div>
        </div>
      </div>
      
      <div className="text-sm text-foreground/90 bg-muted/30 p-3 rounded border border-border/30 mb-3">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
          {entry.content}
        </pre>
      </div>

      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs p-2 h-8"
          >
            <span className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Blockchain Details
            </span>
            {showDetails ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="text-xs space-y-1">
              <div className="font-medium text-muted-foreground">Cryptographic Hash:</div>
              <code className="block font-mono text-xs bg-muted/50 p-2 rounded break-all">
                {entry.hash}
              </code>
            </div>
            
            {entry.prevHash && (
              <div className="text-xs space-y-1">
                <div className="font-medium text-muted-foreground">Previous Hash (Chain Link):</div>
                <code className="block font-mono text-xs bg-muted/50 p-2 rounded break-all">
                  {entry.prevHash}
                </code>
              </div>
            )}
            
            {entry.batchId && (
              <div className="text-xs space-y-1">
                <div className="font-medium text-muted-foreground">Batch ID:</div>
                <code className="block font-mono text-xs bg-muted/50 p-2 rounded break-all">
                  {entry.batchId}
                </code>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
