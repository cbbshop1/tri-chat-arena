import { useState, useEffect, useMemo } from 'react';
import { Search, Pin, Calendar, User, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { highlightSearchTerms } from '@/lib/highlightText';
import { formatDistanceToNow } from 'date-fns';

interface LedgerEntry {
  id: string;
  created_at: string;
  agent_id: string;
  entry_type: string;
  body_json: any;
  body_hash: string;
  prev_hash?: string;
}

interface LedgerSearcherProps {
  onAttachEntry: (entry: LedgerEntry) => void;
  attachedEntryIds: string[];
}

const typeColors: Record<string, string> = {
  memory: 'text-blue-600 dark:text-blue-400',
  context: 'text-purple-600 dark:text-purple-400',
  experience: 'text-green-600 dark:text-green-400',
  reflection: 'text-orange-600 dark:text-orange-400',
  consolidation: 'text-pink-600 dark:text-pink-400',
  research: 'text-cyan-600 dark:text-cyan-400',
};

const dateRanges = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  'all': { label: 'All time', days: null },
};

export default function LedgerSearcher({ onAttachEntry, attachedEntryIds }: LedgerSearcherProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch entries
  useEffect(() => {
    if (!user) return;

    const fetchEntries = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: sortBy === 'oldest' });

        const { data, error } = await query;

        if (error) throw error;
        setEntries(data || []);
      } catch (error) {
        console.error('Error fetching ledger entries:', error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user, sortBy]);

  // Get unique agents
  const availableAgents = useMemo(() => {
    const agents = new Set(entries.map(e => e.agent_id));
    return Array.from(agents).sort();
  }, [entries]);

  // Get unique types
  const availableTypes = useMemo(() => {
    const types = new Set(entries.map(e => e.entry_type));
    return Array.from(types).sort();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Search filter
    if (debouncedSearch) {
      filtered = filtered.filter(entry => {
        const content = JSON.stringify(entry.body_json).toLowerCase();
        return content.includes(debouncedSearch.toLowerCase());
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.entry_type === typeFilter);
    }

    // Agent filter
    if (agentFilter !== 'all') {
      filtered = filtered.filter(entry => entry.agent_id === agentFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const range = dateRanges[dateRange as keyof typeof dateRanges];
      if (range.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - range.days);
        filtered = filtered.filter(entry => new Date(entry.created_at) >= cutoffDate);
      }
    }

    return filtered;
  }, [entries, debouncedSearch, typeFilter, agentFilter, dateRange]);

  const truncateContent = (content: any, maxLength: number = 150): string => {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const isAttached = (entryId: string) => attachedEntryIds.includes(entryId);

  if (loading) {
    return (
      <div className="space-y-3 p-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-2 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {availableAgents.map(agent => (
                <SelectItem key={agent} value={agent}>{agent}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(dateRanges).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'oldest')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="text-xs text-muted-foreground">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'memory' : 'memories'}
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredEntries.length === 0 ? (
            <Card className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch || typeFilter !== 'all' || agentFilter !== 'all' || dateRange !== 'all'
                  ? 'No memories match your search criteria'
                  : 'No memories found. Create entries from the Memories page.'}
              </p>
            </Card>
          ) : (
            filteredEntries.map(entry => {
              const content = truncateContent(entry.body_json);
              const attached = isAttached(entry.id);

              return (
                <Card key={entry.id} className={`p-3 ${attached ? 'border-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={typeColors[entry.entry_type] || ''}>
                        {entry.entry_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.agent_id}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={attached ? 'secondary' : 'ghost'}
                      onClick={() => !attached && onAttachEntry(entry)}
                      disabled={attached}
                      className="h-7 px-2"
                    >
                      <Pin className={`h-3 w-3 ${attached ? 'fill-current' : ''}`} />
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </div>

                  <p className="text-sm">
                    {debouncedSearch ? highlightSearchTerms(content, debouncedSearch) : content}
                  </p>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
