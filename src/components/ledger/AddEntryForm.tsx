import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Hash, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AddEntryFormProps {
  onAddEntry: (entry: any) => void;
}

export function AddEntryForm({ onAddEntry }: AddEntryFormProps) {
  const [agentId, setAgentId] = useState("");
  const [type, setType] = useState<"memory" | "context" | "experience" | "consolidation" | "anchor_memory">("memory");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentId.trim() || !content.trim()) {
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save entries to the ledger",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const bodyJson = {
        agent_id: agentId.trim(),
        entry_type: type,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        actor: user.id
      };

      const { data, error } = await supabase.functions.invoke('save-to-ledger', {
        body: {
          agent_id: agentId.trim(),
          entry_type: type,
          body_json: bodyJson
        }
      });

      if (error) {
        console.error('[AddEntryForm] Edge function error:', error);
        throw error;
      }

      if (!data || !data.ledger_entry_id) {
        throw new Error('Invalid response from save-to-ledger function');
      }

      const entry = {
        id: data.ledger_entry_id,
        timestamp: new Date().toISOString(),
        hash: data.body_hash,
        agentId: agentId.trim(),
        type: type,
        content: content.trim(),
        size: new Blob([content]).size,
        prevHash: data.prev_hash || null,
        batchId: null
      };

      onAddEntry(entry);
      
      toast({
        title: "Entry Added",
        description: `Memory anchor logged to blockchain with hash ${entry.hash.slice(0, 8)}...`,
      });

      setContent("");
    } catch (error) {
      console.error('[AddEntryForm] Error adding entry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add entry to ledger",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentSize = new Blob([content]).size;

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Add Memory Anchor</h2>
          <p className="text-sm text-muted-foreground">Log critical AI context to blockchain ledger</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agentId" className="text-sm font-medium">
              Agent ID
            </Label>
            <Input
              id="agentId"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="ai-agent-001"
              className="font-mono bg-input/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Entry Type
            </Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger className="bg-input/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="memory">Memory</SelectItem>
                <SelectItem value="context">Context</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="consolidation">Consolidation</SelectItem>
                <SelectItem value="anchor_memory">Anchor Memory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content" className="text-sm font-medium">
              Memory Content
            </Label>
            <div className="flex items-center gap-2">
              <Badge 
                variant={contentSize > 1000 ? "destructive" : "outline"} 
                className="text-xs font-mono"
              >
                {contentSize} bytes
              </Badge>
              {contentSize > 1000 && (
                <span className="text-xs text-destructive">Consider smaller content for efficiency</span>
              )}
            </div>
          </div>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Critical context, experience, or memory data..."
            className="min-h-[120px] font-mono text-sm bg-input/50 resize-none"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Will be timestamped and hash-locked on submission</span>
          </div>
          
          <Button 
            type="submit" 
            disabled={isSubmitting || !agentId || !content}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Hash className="h-4 w-4 mr-2 animate-spin" />
                Anchoring...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add to Ledger
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
