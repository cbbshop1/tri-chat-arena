import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, BookOpen, Search, X } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface KnowledgeManagerProps {
  knowledgeBase: KnowledgeItem[];
  onRefresh: () => void;
}

export default function KnowledgeManager({ knowledgeBase, onRefresh }: KnowledgeManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredKnowledge = knowledgeBase.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('knowledge_base')
          .update({ title: title.trim(), content: content.trim() })
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Knowledge item updated successfully",
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('knowledge_base')
          .insert([{
            title: title.trim(),
            content: content.trim(),
            user_id: null // For development - anonymous access
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Knowledge item added successfully",
        });
      }

      setTitle('');
      setContent('');
      setEditingItem(null);
      setIsDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving knowledge item:', error);
      toast({
        title: "Error",
        description: "Failed to save knowledge item",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Knowledge item deleted successfully",
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      toast({
        title: "Error",
        description: "Failed to delete knowledge item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Knowledge Base</h2>
          <Badge variant="secondary">{knowledgeBase.length} items</Badge>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Knowledge Item' : 'Add Knowledge Item'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Knowledge item title..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Knowledge content..."
                  rows={8}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search knowledge base..."
          className="pl-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchTerm('')}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-3">
          {filteredKnowledge.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No knowledge items match your search' : 'No knowledge items yet. Add some to get started!'}
            </div>
          ) : (
            filteredKnowledge.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-2 truncate">{item.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Added {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}