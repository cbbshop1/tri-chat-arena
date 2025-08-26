import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, Plus, Trash2, Bot, Users, LogOut, User, Forward, ChevronDown, Paperclip, X, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KnowledgeManager from './KnowledgeManager';
// import { useAuth } from '@/hooks/useAuth';

type AIModel = "chatgpt" | "claude" | "deepseek" | "all";
type SpecificAI = Exclude<AIModel, "all">;

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  ai_model?: SpecificAI;
  created_at: string;
}

interface ChatFile {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  content_preview?: string;
  created_at: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const AI_CONFIGS = {
  chatgpt: { name: "ChatGPT", color: "chatgpt", icon: "🤖" },
  claude: { name: "Claude", color: "claude", icon: "🧠" },
  deepseek: { name: "DeepSeek", color: "deepseek", icon: "🔍" },
  all: { name: "All AIs", color: "gradient-glow", icon: "🌟" }
};

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedAI, setSelectedAI] = useState<AIModel>("all");
  const [loading, setLoading] = useState(false);
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  // const { user, signOut } = useAuth();

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Type-safe mapping to ensure role is correct type
      const typedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        ai_model: msg.ai_model as SpecificAI | undefined,
        created_at: msg.created_at
      }));
      
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const createNewSession = async () => {
    try {
      // For development - create session without auth check
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ title: 'New Chat', user_id: null }])
        .select()
        .single();

      if (error) throw error;
      
      await loadSessions();
      setCurrentSessionId(data.id);
      toast({
        title: "Success",
        description: "New chat session created",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create new session",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      
      await loadSessions();
      toast({
        title: "Success",
        description: "Session deleted",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant', aiModel?: SpecificAI) => {
    if (!currentSessionId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          session_id: currentSessionId,
          content,
          role,
          ai_model: aiModel
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId);

      if (error) throw error;
      await loadSessions();
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const getConversationHistory = () => {
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  };

  const callAI = async (ai: SpecificAI, message: string): Promise<string> => {
    const conversationHistory = getConversationHistory();
    const context = getContextForAI();
    const functionName = ai === 'chatgpt' ? 'chat-openai' : `chat-${ai}`;
    
    // Prepend context to the message if available
    const messageWithContext = context ? `${context}\n\nUser Message: ${message}` : message;
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { 
        message: messageWithContext,
        conversation_history: conversationHistory
      }
    });

    if (error) throw error;
    return data.reply;
  };

  const forwardMessage = async (content: string, fromAI: SpecificAI, toAI: SpecificAI) => {
    if (!currentSessionId) return;
    
    setLoading(true);
    try {
      // Create a forwarded message prompt
      const forwardPrompt = `[Forwarded from ${AI_CONFIGS[fromAI].name}]: ${content}`;
      
      // Call the target AI
      const reply = await callAI(toAI, forwardPrompt);
      await saveMessage(reply, 'assistant', toAI);
      
      // Reload messages to show the forwarded response
      await loadMessages(currentSessionId);
      
      toast({
        title: "Message forwarded",
        description: `Forwarded to ${AI_CONFIGS[toAI].name}`,
      });
    } catch (error) {
      console.error(`Error forwarding to ${toAI}:`, error);
      toast({
        title: "Error",
        description: `Failed to forward to ${AI_CONFIGS[toAI].name}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load knowledge base
  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKnowledgeBase(data || []);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    }
  };

  const uploadFile = async (file: File) => {
    if (!currentSessionId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentSessionId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Read file content for preview (if text file)
      let contentPreview = '';
      if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
        contentPreview = await file.text();
        if (contentPreview.length > 1000) {
          contentPreview = contentPreview.substring(0, 1000) + '...';
        }
      }

      // Save file metadata
      const { error: dbError } = await supabase
        .from('chat_files')
        .insert([{
          session_id: currentSessionId,
          filename: file.name,
          file_path: uploadData.path,
          file_type: file.type,
          file_size: file.size,
          content_preview: contentPreview
        }]);

      if (dbError) throw dbError;

      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully`,
      });

      loadChatFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const loadChatFiles = async () => {
    if (!currentSessionId) return;

    try {
      const { data, error } = await supabase
        .from('chat_files')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatFiles(data || []);
    } catch (error) {
      console.error('Error loading chat files:', error);
    }
  };

  // Load files when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadChatFiles();
    } else {
      setChatFiles([]);
    }
  }, [currentSessionId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    files.forEach(uploadFile);
    // Reset the input
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getContextForAI = () => {
    let context = '';
    
    // Add knowledge base context
    if (knowledgeBase.length > 0) {
      context += '\n--- Knowledge Base ---\n';
      knowledgeBase.forEach(item => {
        context += `${item.title}:\n${item.content}\n\n`;
      });
    }

    // Add file context
    if (chatFiles.length > 0) {
      context += '\n--- Uploaded Files ---\n';
      chatFiles.forEach(file => {
        if (file.content_preview) {
          context += `File: ${file.filename}\nContent: ${file.content_preview}\n\n`;
        } else {
          context += `File: ${file.filename} (${file.file_type}, ${Math.round(file.file_size / 1024)}KB)\n\n`;
        }
      });
    }

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !currentSessionId) return;

    const message = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Save user message
      await saveMessage(message, 'user');
      await loadMessages(currentSessionId);

      // Update session title if it's the first message
      if (messages.length === 0) {
        const title = message.length > 30 ? message.substring(0, 30) + "..." : message;
        await updateSessionTitle(currentSessionId, title);
      }

      if (selectedAI === "all") {
        // Call all AIs in parallel
        const aiPromises = (["chatgpt", "claude", "deepseek"] as SpecificAI[]).map(async (ai) => {
          try {
            const reply = await callAI(ai, message);
            await saveMessage(reply, 'assistant', ai);
            return { ai, reply, success: true };
          } catch (error) {
            console.error(`Error with ${ai}:`, error);
            const errorMsg = `Error: ${error.message}`;
            await saveMessage(errorMsg, 'assistant', ai);
            return { ai, reply: errorMsg, success: false };
          }
        });

        await Promise.all(aiPromises);
      } else {
        // Call specific AI
        try {
          const reply = await callAI(selectedAI as SpecificAI, message);
          await saveMessage(reply, 'assistant', selectedAI as SpecificAI);
        } catch (error) {
          console.error(`Error with ${selectedAI}:`, error);
          await saveMessage(`Error: ${error.message}`, 'assistant', selectedAI as SpecificAI);
        }
      }

      // Reload messages to show responses
      await loadMessages(currentSessionId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-primary">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
        <div className="p-4 border-b border-border">
          <Button onClick={createNewSession} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <TabsList className="mx-2 mt-2">
            <TabsTrigger value="chats" className="flex-1">
              <MessageSquare className="w-4 h-4 mr-1" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex-1">
              <Bot className="w-4 h-4 mr-1" />
              Knowledge
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chats" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "p-3 mb-2 rounded-lg cursor-pointer transition-colors group",
                      currentSessionId === session.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-card/80'
                    )}
                    onClick={() => setCurrentSessionId(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate text-sm">{session.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 ml-2 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="knowledge" className="flex-1 mt-0 overflow-hidden">
            <div className="p-2 h-full">
              <KnowledgeManager 
                knowledgeBase={knowledgeBase} 
                onRefresh={loadKnowledgeBase}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-glow bg-clip-text text-transparent">
              Multi-AI Chat
            </h1>
          </div>
          
          {/* AI Selector */}
          <div className="flex gap-2">
            <Button
              variant={selectedAI === "all" ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedAI("all")}
              className={cn(
                "gap-2",
                selectedAI === "all" && "bg-gradient-glow"
              )}
            >
              <Users className="w-4 h-4" />
              All AIs
            </Button>
            {Object.entries(AI_CONFIGS)
              .filter(([key]) => key !== 'all')
              .map(([key, config]) => (
              <Button
                key={key}
                variant={selectedAI === key ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedAI(key as AIModel)}
                className={cn(
                  "gap-2",
                  selectedAI === key && `bg-${config.color} hover:bg-${config.color}/90`
                )}
              >
                <span>{config.icon}</span>
                {config.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {!currentSessionId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a chat session or create a new one to start chatting</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && message.ai_model && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      message.ai_model === "chatgpt" && "bg-chatgpt text-chatgpt-foreground",
                      message.ai_model === "claude" && "bg-claude text-claude-foreground", 
                      message.ai_model === "deepseek" && "bg-deepseek text-deepseek-foreground"
                    )}>
                      {AI_CONFIGS[message.ai_model].icon}
                    </div>
                  )}
                  
                  <Card className={cn(
                    "p-3 max-w-2xl",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto" 
                      : "bg-card"
                  )}>
                    {message.role === 'assistant' && message.ai_model && (
                      <Badge 
                        className={cn(
                          "mb-2 text-xs",
                          message.ai_model === "chatgpt" && "bg-chatgpt/20 text-chatgpt border-chatgpt/30",
                          message.ai_model === "claude" && "bg-claude/20 text-claude border-claude/30",
                          message.ai_model === "deepseek" && "bg-deepseek/20 text-deepseek border-deepseek/30"
                        )}
                      >
                        {AI_CONFIGS[message.ai_model].name}
                      </Badge>
                     )}
                     <div className="flex items-start justify-between gap-2">
                       <p className="text-sm whitespace-pre-wrap flex-1">{message.content}</p>
                       {message.role === 'assistant' && message.ai_model && (
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                               <Forward className="h-3 w-3" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             {Object.entries(AI_CONFIGS)
                               .filter(([key]) => key !== 'all' && key !== message.ai_model)
                               .map(([key, config]) => (
                                 <DropdownMenuItem
                                   key={key}
                                   onClick={() => forwardMessage(message.content, message.ai_model!, key as SpecificAI)}
                                   className="gap-2"
                                 >
                                   <span>{config.icon}</span>
                                   Forward to {config.name}
                                 </DropdownMenuItem>
                               ))}
                           </DropdownMenuContent>
                         </DropdownMenu>
                       )}
                     </div>
                     <p className="text-xs text-muted-foreground mt-1">
                       {new Date(message.created_at).toLocaleTimeString()}
                     </p>
                  </Card>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <Card className="p-3 bg-card">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground text-sm">AI is thinking...</span>
                    </div>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            {/* Context Info */}
            {(knowledgeBase.length > 0 || chatFiles.length > 0) && (
              <div className="mb-3 p-2 bg-card border border-border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Available Context:</div>
                <div className="flex flex-wrap gap-1">
                  {knowledgeBase.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      📚 {knowledgeBase.length} knowledge item{knowledgeBase.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {chatFiles.map((file) => (
                    <Badge key={file.id} variant="outline" className="text-xs">
                      <File className="w-3 h-3 mr-1" />
                      {file.filename}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".txt,.md,.json,.csv,.pdf,.doc,.docx"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!currentSessionId}
                className="shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={currentSessionId ? `Message ${selectedAI === "all" ? "all AIs" : AI_CONFIGS[selectedAI as keyof typeof AI_CONFIGS]?.name || selectedAI}...` : "Create or select a session to start chatting"}
                disabled={loading || !currentSessionId}
                className="flex-1 bg-input border-border focus:ring-ring"
              />
              <Button 
                onClick={handleSend} 
                disabled={loading || !input.trim() || !currentSessionId}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-center mt-2">
              <Badge variant="secondary" className="text-xs">
                {selectedAI === "all" ? "Broadcasting to all AIs" : `Chatting with ${AI_CONFIGS[selectedAI as keyof typeof AI_CONFIGS]?.name || selectedAI}`}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}