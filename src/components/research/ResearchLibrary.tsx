import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Search, Upload, Download, Copy, Eye, Pencil, Trash2, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ResearchEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | any;
  source_filename: string | null;
  created_at: string;
}

interface DuplicateDecision {
  action: "skip" | "overwrite" | "rename";
  applyToAll: boolean;
}

export function ResearchLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [researchLibrary, setResearchLibrary] = useState<ResearchEntry[]>([]);
  const [filteredLibrary, setFilteredLibrary] = useState<ResearchEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importCategory, setImportCategory] = useState("custom");
  const [duplicateHandling, setDuplicateHandling] = useState<"prompt" | "skip" | "overwrite">("prompt");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("custom");
  const [editingEntry, setEditingEntry] = useState<ResearchEntry | null>(null);
  const [previewEntry, setPreviewEntry] = useState<ResearchEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ResearchEntry | null>(null);
  
  // Duplicate handling
  const [currentDuplicate, setCurrentDuplicate] = useState<{ title: string; content: string; filename: string } | null>(null);
  const [pendingImports, setPendingImports] = useState<Array<{ title: string; content: string; filename: string }>>([]);
  const [duplicateDecision, setDuplicateDecision] = useState<DuplicateDecision | null>(null);

  useEffect(() => {
    loadResearchLibrary();
  }, [user]);

  useEffect(() => {
    filterLibrary();
  }, [researchLibrary, searchTerm, categoryFilter]);

  const loadResearchLibrary = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("research_library")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResearchLibrary((data || []).map(entry => ({
        ...entry,
        tags: Array.isArray(entry.tags) ? entry.tags : []
      })));
    } catch (error) {
      console.error("Error loading research library:", error);
      toast({
        title: "Error",
        description: "Failed to load research library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLibrary = () => {
    let filtered = researchLibrary;

    if (categoryFilter !== "all") {
      filtered = filtered.filter((entry) => entry.category === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.title.toLowerCase().includes(term) ||
          entry.content.toLowerCase().includes(term)
      );
    }

    setFilteredLibrary(filtered);
  };

  const parseMarkdownFile = async (file: File): Promise<{ title: string; content: string; filename: string }> => {
    const content = await file.text();
    const title = file.name.replace(/\.md$/i, "");
    return { title, content, filename: file.name };
  };

  const checkDuplicate = async (title: string): Promise<boolean> => {
    const { data } = await supabase
      .from("research_library")
      .select("id")
      .eq("title", title)
      .eq("user_id", user?.id)
      .single();
    
    return !!data;
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one Markdown file",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedFiles = await Promise.all(
        Array.from(selectedFiles).map(parseMarkdownFile)
      );

      setPendingImports(parsedFiles);
      processImports(parsedFiles);
    } catch (error) {
      console.error("Error importing files:", error);
      toast({
        title: "Import failed",
        description: "Failed to read one or more files",
        variant: "destructive",
      });
    }
  };

  const processImports = async (files: Array<{ title: string; content: string; filename: string }>) => {
    let successCount = 0;
    let skipCount = 0;
    let globalDecision: DuplicateDecision | null = null;

    for (const file of files) {
      const isDuplicate = await checkDuplicate(file.title);

      if (isDuplicate) {
        if (duplicateHandling === "skip" || (globalDecision?.applyToAll && globalDecision.action === "skip")) {
          skipCount++;
          continue;
        }

        if (duplicateHandling === "overwrite" || (globalDecision?.applyToAll && globalDecision.action === "overwrite")) {
          await overwriteEntry(file.title, file.content, file.filename);
          successCount++;
          continue;
        }

        if (duplicateHandling === "prompt" && !globalDecision?.applyToAll) {
          // Show duplicate dialog and wait for user decision
          const decision = await promptForDuplicate(file);
          
          if (decision.applyToAll) {
            globalDecision = decision;
          }

          if (decision.action === "skip") {
            skipCount++;
            continue;
          } else if (decision.action === "overwrite") {
            await overwriteEntry(file.title, file.content, file.filename);
            successCount++;
          } else if (decision.action === "rename") {
            await insertEntry(file.title, file.content, file.filename, true);
            successCount++;
          }
          continue;
        }
      }

      // Not a duplicate, insert normally
      await insertEntry(file.title, file.content, file.filename);
      successCount++;
    }

    setImportDialogOpen(false);
    setSelectedFiles([]);
    setPendingImports([]);
    loadResearchLibrary();

    toast({
      title: "Import complete",
      description: `Imported ${successCount} entries${skipCount > 0 ? `, skipped ${skipCount}` : ""}`,
    });
  };

  const promptForDuplicate = (file: { title: string; content: string; filename: string }): Promise<DuplicateDecision> => {
    return new Promise((resolve) => {
      setCurrentDuplicate(file);
      setDuplicateDialogOpen(true);
      
      // Store resolve function to call later
      (window as any).__duplicateResolve = resolve;
    });
  };

  const handleDuplicateDecision = (action: "skip" | "overwrite" | "rename", applyToAll: boolean) => {
    const decision: DuplicateDecision = { action, applyToAll };
    setDuplicateDecision(decision);
    setDuplicateDialogOpen(false);
    
    if ((window as any).__duplicateResolve) {
      (window as any).__duplicateResolve(decision);
      delete (window as any).__duplicateResolve;
    }
  };

  const insertEntry = async (title: string, content: string, filename: string, rename = false) => {
    let finalTitle = title;
    
    if (rename) {
      let counter = 2;
      while (await checkDuplicate(`${title} (${counter})`)) {
        counter++;
      }
      finalTitle = `${title} (${counter})`;
    }

    const { error } = await supabase.from("research_library").insert({
      user_id: user?.id,
      title: finalTitle,
      content,
      category: importCategory,
      source_filename: filename,
      tags: [],
    });

    if (error) throw error;
  };

  const overwriteEntry = async (title: string, content: string, filename: string) => {
    const { error } = await supabase
      .from("research_library")
      .update({
        content,
        category: importCategory,
        source_filename: filename,
        updated_at: new Date().toISOString(),
      })
      .eq("title", title)
      .eq("user_id", user?.id);

    if (error) throw error;
  };

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("research_library").insert({
        user_id: user?.id,
        title: title.trim(),
        content: content.trim(),
        category,
        tags: [],
      });

      if (error) throw error;

      toast({
        title: "Entry added",
        description: "Research entry has been added successfully",
      });

      resetForm();
      setAddDialogOpen(false);
      loadResearchLibrary();
    } catch (error) {
      console.error("Error adding entry:", error);
      toast({
        title: "Error",
        description: "Failed to add research entry",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingEntry || !title.trim() || !content.trim()) return;

    try {
      const { error } = await supabase
        .from("research_library")
        .update({
          title: title.trim(),
          content: content.trim(),
          category,
        })
        .eq("id", editingEntry.id);

      if (error) throw error;

      toast({
        title: "Entry updated",
        description: "Research entry has been updated successfully",
      });

      resetForm();
      setEditDialogOpen(false);
      loadResearchLibrary();
    } catch (error) {
      console.error("Error updating entry:", error);
      toast({
        title: "Error",
        description: "Failed to update research entry",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    try {
      const { error } = await supabase
        .from("research_library")
        .delete()
        .eq("id", deletingEntry.id);

      if (error) throw error;

      toast({
        title: "Entry deleted",
        description: "Research entry has been deleted successfully",
      });

      setDeleteDialogOpen(false);
      setDeletingEntry(null);
      loadResearchLibrary();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete research entry",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const handleTagToggle = async (entryId: string, tag: string, currentTags: string[]) => {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    try {
      const { error } = await supabase
        .from("research_library")
        .update({ tags: newTags })
        .eq("id", entryId);

      if (error) throw error;

      loadResearchLibrary();
    } catch (error) {
      console.error("Error updating tags:", error);
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(researchLibrary, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research_library_export_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Exported ${researchLibrary.length} entries`,
    });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("custom");
    setEditingEntry(null);
  };

  const openEditDialog = (entry: ResearchEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setEditDialogOpen(true);
  };

  const openPreviewDialog = (entry: ResearchEntry) => {
    setPreviewEntry(entry);
    setPreviewDialogOpen(true);
  };

  const openDeleteDialog = (entry: ResearchEntry) => {
    setDeletingEntry(entry);
    setDeleteDialogOpen(true);
  };

  const categories = [
    { value: "all", label: "All" },
    { value: "codex_section", label: "Codex" },
    { value: "emotional_analog", label: "Analogs" },
    { value: "conversation_transcript", label: "Transcripts" },
    { value: "custom", label: "Custom" },
  ];

  const aiTags = [
    { value: "shown_to_claude", label: "Claude" },
    { value: "shown_to_chatgpt", label: "ChatGPT" },
    { value: "shown_to_deepseek", label: "DeepSeek" },
    { value: "shown_to_all", label: "All AIs" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Research Library</h2>
          <Badge variant="secondary">{researchLibrary.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="mb-4">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="space-y-3">
          {filteredLibrary.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{entry.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{entry.category.replace(/_/g, " ")}</Badge>
                      {entry.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag.replace("shown_to_", "")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2 mb-3">
                  {entry.content.substring(0, 150)}...
                </CardDescription>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(entry.content)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Select onValueChange={(tag) => handleTagToggle(entry.id, tag, entry.tags)}>
                    <SelectTrigger className="w-[140px] h-9">
                      <Tag className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tag AI" />
                    </SelectTrigger>
                    <SelectContent>
                      {aiTags.map((tag) => (
                        <SelectItem key={tag.value} value={tag.value}>
                          {entry.tags.includes(tag.value) ? "✓ " : ""}{tag.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => openPreviewDialog(entry)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(entry)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredLibrary.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || categoryFilter !== "all"
                ? "No entries found matching your filters"
                : "No research entries yet. Import Markdown files or add entries manually."}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Markdown Files</DialogTitle>
            <DialogDescription>
              Select one or more .md files to import into your research library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="files">Select Files</Label>
              <Input
                id="files"
                type="file"
                accept=".md"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              />
              {selectedFiles.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedFiles.length} file(s) selected
                </p>
              )}
            </div>
            <div>
              <Label>Category</Label>
              <RadioGroup value={importCategory} onValueChange={setImportCategory}>
                {categories.slice(1).map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={cat.value} id={cat.value} />
                    <Label htmlFor={cat.value}>{cat.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Duplicate Handling</Label>
              <RadioGroup value={duplicateHandling} onValueChange={(v) => setDuplicateHandling(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prompt" id="prompt" />
                  <Label htmlFor="prompt">Prompt me for each duplicate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip">Skip duplicates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="overwrite" id="overwrite" />
                  <Label htmlFor="overwrite">Overwrite duplicates</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Decision Dialog */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Entry Found</AlertDialogTitle>
            <AlertDialogDescription>
              An entry titled "{currentDuplicate?.title}" already exists. How would you like to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <div className="flex gap-2 w-full">
              <AlertDialogAction onClick={() => handleDuplicateDecision("skip", false)} className="flex-1">
                Skip this file
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleDuplicateDecision("overwrite", false)} className="flex-1">
                Overwrite
              </AlertDialogAction>
            </div>
            <div className="flex gap-2 w-full">
              <AlertDialogAction onClick={() => handleDuplicateDecision("rename", false)} className="flex-1">
                Import as "{currentDuplicate?.title} (2)"
              </AlertDialogAction>
              <AlertDialogCancel className="flex-1 mt-0">Cancel import</AlertDialogCancel>
            </div>
            <div className="flex gap-2 w-full justify-center pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => handleDuplicateDecision("skip", true)}>
                Skip all duplicates
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDuplicateDecision("overwrite", true)}>
                Overwrite all duplicates
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Research Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-title">Title</Label>
              <Input
                id="add-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title..."
              />
            </div>
            <div>
              <Label>Category</Label>
              <RadioGroup value={category} onValueChange={setCategory}>
                {categories.slice(1).map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={cat.value} id={`add-${cat.value}`} />
                    <Label htmlFor={`add-${cat.value}`}>{cat.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="add-content">Content</Label>
              <Textarea
                id="add-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Entry content (supports Markdown)..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Research Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title..."
              />
            </div>
            <div>
              <Label>Category</Label>
              <RadioGroup value={category} onValueChange={setCategory}>
                {categories.slice(1).map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={cat.value} id={`edit-${cat.value}`} />
                    <Label htmlFor={`edit-${cat.value}`}>{cat.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Entry content (supports Markdown)..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewEntry?.title}</DialogTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{previewEntry?.category.replace(/_/g, " ")}</Badge>
              {previewEntry?.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag.replace("shown_to_", "")}
                </Badge>
              ))}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{previewEntry?.content || ""}</ReactMarkdown>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingEntry?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
