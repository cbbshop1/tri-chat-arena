import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AddEntryForm } from "@/components/ledger/AddEntryForm";
import { LedgerEntry } from "@/components/ledger/LedgerEntry";
import { LedgerStats } from "@/components/ledger/LedgerStats";
import { LedgerFilters } from "@/components/ledger/LedgerFilters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Database, Calendar, ChevronDown, ChevronUp, ArrowLeft, User, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";

const Memories = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData = data.map(entry => ({
        id: entry.id,
        timestamp: entry.created_at,
        hash: entry.body_hash,
        agentId: entry.agent_id,
        type: entry.entry_type,
        content: (entry.body_json as any)?.content || 'No content',
        size: new Blob([(entry.body_json as any)?.content || '']).size,
        prevHash: entry.prev_hash,
        batchId: entry.batch_id
      }));
      
      setEntries(transformedData);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAddEntry = (newEntry: any) => {
    setEntries(prev => [newEntry, ...prev]);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = searchTerm === "" || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.agentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.id.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesType = typeFilter === "all" || entry.type === typeFilter;
      const matchesAgent = agentFilter === "all" || entry.agentId === agentFilter;
      
      return matchesSearch && matchesType && matchesAgent;
    });
  }, [entries, searchTerm, typeFilter, agentFilter]);

  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const totalAgents = new Set(entries.map(e => e.agentId)).size;
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const lastEntry = entries.length > 0 ? entries[0].timestamp : undefined;
    
    return { totalEntries, totalAgents, totalSize, lastEntry };
  }, [entries]);

  const availableAgents = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.agentId))).sort();
  }, [entries]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <img src={logo} alt="Logo" className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold font-mono text-foreground">
                  AI Memory Ledger
                </h1>
                <p className="text-sm text-muted-foreground">
                  On-chain timestamped continuity anchor system
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  {user.email}
                </div>
              )}
              <Badge variant="outline" className="font-mono text-xs">
                <Database className="h-3 w-3 mr-1" />
                Blockchain Connected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {user && (
                <Button variant="outline" onClick={signOut} size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <LedgerStats {...stats} />

        {/* Add Entry Form */}
        {showAddForm && (
          <AddEntryForm onAddEntry={handleAddEntry} />
        )}

        <Separator className="opacity-20" />

        {/* Filters and Entries */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold font-mono">Memory Entries</h2>
              <p className="text-sm text-muted-foreground">
                {filteredEntries.length} of {entries.length} entries shown
              </p>
            </div>
            <Badge variant="secondary" className="font-mono">
              <Calendar className="h-3 w-3 mr-1" />
              Live Feed
            </Badge>
          </div>

          <LedgerFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            agentFilter={agentFilter}
            setAgentFilter={setAgentFilter}
            availableAgents={availableAgents}
          />

          {/* Entries List */}
          {loading ? (
            <Card className="p-12 text-center bg-card/30">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading entries...</p>
            </Card>
          ) : filteredEntries.length === 0 ? (
            <Card className="p-12 text-center bg-card/30 border-dashed">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No entries found
              </h3>
              <p className="text-sm text-muted-foreground">
                {entries.length === 0 
                  ? "Start by adding your first memory anchor to the ledger"
                  : "Try adjusting your search criteria"}
              </p>
            </Card>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <LedgerEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};

export default Memories;
