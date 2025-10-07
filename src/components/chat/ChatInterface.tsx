import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { Send, MessageSquare, Plus, Trash2, Bot, Users, LogOut, User, Forward, ChevronDown, Paperclip, X, File, Download } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KnowledgeManager from './KnowledgeManager';
import { useAuth } from '@/hooks/useAuth';

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
  target_ai?: SpecificAI | 'all';
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
  const [attachedKnowledge, setAttachedKnowledge] = useState<KnowledgeItem[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ChatFile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { subscribed } = useSubscription();
  const { canSendMessage, remainingMessages, incrementUsage, DAILY_MESSAGE_LIMIT } = useUsageLimit();
  const { user, signOut } = useAuth();

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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '44px'; // Reset to min height
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // 4 lines approximate
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [input]);

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
        target_ai: (msg as any).target_ai as SpecificAI | 'all' | undefined || 'all',
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
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create a chat session",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ title: 'New Chat', user_id: user.id }])
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

  const saveMessage = async (content: string, role: 'user' | 'assistant', aiModel?: SpecificAI, targetAI?: SpecificAI | 'all'): Promise<Message | null> => {
    if (!currentSessionId) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          session_id: currentSessionId,
          content,
          role,
          ai_model: aiModel,
          target_ai: targetAI // Track which AI this message was intended for
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
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

  const getConversationHistory = (targetAI?: SpecificAI) => {
    return messages
      .filter(msg => {
        if (msg.role === 'assistant') {
          // Only include assistant messages from the target AI
          return msg.ai_model === targetAI;
        } else {
          // For user messages, only include those intended for this AI or forwarded messages
          return msg.target_ai === targetAI || msg.target_ai === 'all' || 
                 (msg.content && msg.content.includes('[Forwarded from'));
        }
      })
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
  };

  const callAI = async (ai: SpecificAI, message: string): Promise<string | { reply: string; tempId: string }> => {
    const conversationHistory = getConversationHistory(ai);
    const context = getContextForAI();
    const functionName = ai === 'chatgpt' ? 'chat-openai' : `chat-${ai}`;
    
    // Prepend context to the message if available
    const messageWithContext = context ? `${context}\n\nUser Message: ${message}` : message;
    
    // For DeepSeek, use streaming
    if (ai === 'deepseek') {
      const result = await streamDeepSeek(messageWithContext, conversationHistory);
      return { reply: result.response, tempId: result.tempId };
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { 
        message: messageWithContext,
        conversation_history: conversationHistory,
        sessionId: currentSessionId // Add sessionId for usage tracking
      }
    });

    if (error) throw error;
    return data.reply;
  };

  const streamDeepSeek = async (message: string, conversationHistory: any[]): Promise<{ response: string; tempId: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `https://ywohajmeijjiubesykcu.supabase.co/functions/v1/chat-deepseek`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          sessionId: currentSessionId
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`DeepSeek streaming error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) throw new Error('No reader available');

    // Create a placeholder message that we'll update
    const tempMessageId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempMessageId,
      content: '',
      role: 'assistant',
      ai_model: 'deepseek',
      created_at: new Date().toISOString()
    }]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                // Update the message in real-time
                setMessages(prev => prev.map(msg => 
                  msg.id === tempMessageId 
                    ? { ...msg, content: fullResponse }
                    : msg
                ));
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Return the full response and the temp ID so we can replace it with the real saved message
    return { response: fullResponse, tempId: tempMessageId };
  };

  const forwardMessage = async (content: string, fromAI: SpecificAI, toAI: SpecificAI) => {
    if (!currentSessionId) return;
    
    setLoading(true);
    try {
      // Create a forwarded message prompt
      const forwardPrompt = `[Forwarded from ${AI_CONFIGS[fromAI].name}]: ${content}`;
      
      // Call the target AI
      const reply = await callAI(toAI, forwardPrompt);
      const replyContent = typeof reply === 'string' ? reply : reply.reply;
      await saveMessage(replyContent, 'assistant', toAI);
      
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
      setAttachedFiles([]);
    }
  }, [currentSessionId]);

  // Auto-attach all knowledge and files when they change
  useEffect(() => {
    setAttachedKnowledge(knowledgeBase);
  }, [knowledgeBase]);

  useEffect(() => {
    setAttachedFiles(chatFiles);
  }, [chatFiles]);

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
    
    // Add attached knowledge base context
    if (attachedKnowledge.length > 0) {
      context += '\n--- Knowledge Base ---\n';
      attachedKnowledge.forEach(item => {
        context += `${item.title}:\n${item.content}\n\n`;
      });
    }

    // Add attached file context
    if (attachedFiles.length > 0) {
      context += '\n--- Uploaded Files ---\n';
      attachedFiles.forEach(file => {
        if (file.content_preview) {
          context += `File: ${file.filename}\nContent: ${file.content_preview}\n\n`;
        } else {
          context += `File: ${file.filename} (${file.file_type}, ${Math.round(file.file_size / 1024)}KB)\n\n`;
        }
      });
    }

    return context;
  };

  const removeAttachedKnowledge = (id: string) => {
    setAttachedKnowledge(prev => prev.filter(item => item.id !== id));
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== id));
  };

  const addBackKnowledge = (item: KnowledgeItem) => {
    setAttachedKnowledge(prev => [...prev, item]);
  };

  const addBackFile = (file: ChatFile) => {
    setAttachedFiles(prev => [...prev, file]);
  };

  const exportChatSession = async () => {
    if (!currentSessionId) {
      toast({
        title: "Error",
        description: "No chat session selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (!currentSession) {
        throw new Error("Session not found");
      }

      const exportData = {
        session: {
          id: currentSession.id,
          title: currentSession.title,
          created_at: currentSession.created_at,
          updated_at: currentSession.updated_at
        },
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          ai_model: msg.ai_model,
          target_ai: msg.target_ai,
          created_at: msg.created_at
        })),
        files: chatFiles.map(file => ({
          id: file.id,
          filename: file.filename,
          file_type: file.file_type,
          file_size: file.file_size,
          content_preview: file.content_preview,
          created_at: file.created_at
        })),
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${currentSession.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Chat session exported successfully",
      });
    } catch (error) {
      console.error('Error exporting chat session:', error);
      toast({
        title: "Error",
        description: "Failed to export chat session",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !currentSessionId) return;

    // Check usage limits for non-subscribers
    if (!canSendMessage) {
      toast({
        title: "Daily limit reached",
        description: `You've reached your daily limit of ${DAILY_MESSAGE_LIMIT} messages. Subscribe for unlimited access.`,
        variant: "destructive",
      });
      return;
    }

    const message = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Increment usage count for non-subscribers
      if (!subscribed) {
        const canContinue = await incrementUsage();
        if (!canContinue) {
          toast({
            title: "Daily limit reached",
            description: `You've reached your daily limit of ${DAILY_MESSAGE_LIMIT} messages. Subscribe for unlimited access.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Save user message with target AI information
      const targetAI = selectedAI === "all" ? "all" : selectedAI as SpecificAI;
      await saveMessage(message, 'user', undefined, targetAI);
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
            const replyContent = typeof reply === 'string' ? reply : reply.reply;
            const tempId = typeof reply === 'object' ? reply.tempId : null;
            
            const savedMessage = await saveMessage(replyContent, 'assistant', ai);
            
            // If streaming (has tempId), replace temp message
            if (tempId && savedMessage) {
              setMessages(prev => prev.map(msg => 
                msg.id === tempId ? savedMessage : msg
              ));
            }
            
            return { ai, reply: replyContent, success: true };
          } catch (error) {
            console.error(`Error with ${ai}:`, error);
            const errorMsg = `Error: ${error.message}`;
            await saveMessage(errorMsg, 'assistant', ai);
            return { ai, reply: errorMsg, success: false };
          }
        });

        await Promise.all(aiPromises);
        // Only reload for non-streaming responses
        await loadMessages(currentSessionId);
      } else {
        // Call specific AI
        try {
          const reply = await callAI(selectedAI as SpecificAI, message);
          const replyContent = typeof reply === 'string' ? reply : reply.reply;
          const tempId = typeof reply === 'object' ? reply.tempId : null;
          
          const savedMessage = await saveMessage(replyContent, 'assistant', selectedAI as SpecificAI);
          
          // If streaming (has tempId), replace temp message with saved one
          if (tempId && savedMessage) {
            setMessages(prev => prev.map(msg => 
              msg.id === tempId ? savedMessage : msg
            ));
          } else {
            // For non-streaming, reload messages
            await loadMessages(currentSessionId);
          }
        } catch (error) {
          console.error(`Error with ${selectedAI}:`, error);
          await saveMessage(`Error: ${error.message}`, 'assistant', selectedAI as SpecificAI);
          await loadMessages(currentSessionId);
        }
      }
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
      <ResizablePanelGroup direction="horizontal" className="min-h-0">
        {/* Sidebar */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
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
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Chat Area */}
        <ResizablePanel defaultSize={75} minSize={60}>
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-glow bg-clip-text text-transparent">
                  Multi-AI Chat
                </h1>
              </div>
              
              {/* AI Selector & Export */}
              <div className="flex gap-2">
                {currentSessionId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportChatSession}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Chat
                  </Button>
                )}
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
            {(attachedKnowledge.length > 0 || attachedFiles.length > 0) && (
              <div className="mb-3 p-2 bg-card border border-border rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">Attached to this message:</div>
                <div className="flex flex-wrap gap-1">
                  {attachedKnowledge.map((item) => (
                    <Badge key={item.id} variant="outline" className="text-xs group">
                      📚 {item.title}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 p-0 ml-1 opacity-0 group-hover:opacity-100"
                        onClick={() => removeAttachedKnowledge(item.id)}
                      >
                        <X className="w-2 h-2" />
                      </Button>
                    </Badge>
                  ))}
                  {attachedFiles.map((file) => (
                    <Badge key={file.id} variant="outline" className="text-xs group">
                      <File className="w-3 h-3 mr-1" />
                      {file.filename}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 p-0 ml-1 opacity-0 group-hover:opacity-100"
                        onClick={() => removeAttachedFile(file.id)}
                      >
                        <X className="w-2 h-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                
                {/* Show detached items that can be re-attached */}
                {(knowledgeBase.length > attachedKnowledge.length || chatFiles.length > attachedFiles.length) && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">Available to attach:</div>
                    <div className="flex flex-wrap gap-1">
                      {knowledgeBase
                        .filter(item => !attachedKnowledge.find(attached => attached.id === item.id))
                        .map((item) => (
                          <Badge 
                            key={item.id} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-primary/20"
                            onClick={() => addBackKnowledge(item)}
                          >
                            📚 {item.title}
                          </Badge>
                        ))}
                      {chatFiles
                        .filter(file => !attachedFiles.find(attached => attached.id === file.id))
                        .map((file) => (
                          <Badge 
                            key={file.id} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-primary/20"
                            onClick={() => addBackFile(file)}
                          >
                            <File className="w-3 h-3 mr-1" />
                            {file.filename}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
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
              
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={currentSessionId ? `Message ${selectedAI === "all" ? "all AIs" : AI_CONFIGS[selectedAI as keyof typeof AI_CONFIGS]?.name || selectedAI}...` : "Create or select a session to start chatting"}
                disabled={loading || !currentSessionId}
                className="flex-1 bg-input border-border focus:ring-ring min-h-[44px] max-h-[120px] resize-none overflow-y-auto"
                rows={1}
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
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" className="text-xs">
                {selectedAI === "all" ? "Broadcasting to all AIs" : `Chatting with ${AI_CONFIGS[selectedAI as keyof typeof AI_CONFIGS]?.name || selectedAI}`}
              </Badge>
              
              {!subscribed && (
                <Badge 
                  variant={remainingMessages <= 5 ? "destructive" : "outline"} 
                  className="text-xs"
                >
                  {remainingMessages === Infinity 
                    ? "Unlimited" 
                    : `${remainingMessages}/${DAILY_MESSAGE_LIMIT} messages left today`
                  }
                </Badge>
              )}
            </div>
          </div>
        </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}