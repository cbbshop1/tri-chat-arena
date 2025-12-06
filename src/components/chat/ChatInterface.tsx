import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { useIsMobile } from '@/hooks/use-mobile';
import { Send, MessageSquare, Plus, Trash2, Bot, Users, LogOut, User, Forward, ChevronDown, Paperclip, X, File, Download, FileText } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import KnowledgeManager from './KnowledgeManager';
import LedgerSearcher from './LedgerSearcher';
import { ResearchLibrary } from '@/components/research/ResearchLibrary';
import { useAuth } from '@/hooks/useAuth';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileAISelector } from './MobileAISelector';
import Markdown from 'react-markdown';

type AIModel = "chatgpt" | "claude" | "deepseek" | "all";
type SpecificAI = Exclude<AIModel, "all">;
type MobileTab = 'chats' | 'knowledge' | 'research' | 'memories';

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
  ledger?: {
    entry_id: string;
    body_hash: string;
    prev_hash: string | null;
  };
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

interface LedgerEntry {
  id: string;
  content: string;
  agentId: string;
  type: string;
  timestamp: string;
}

interface LedgerSearchEntry {
  id: string;
  created_at: string;
  agent_id: string;
  entry_type: string;
  body_json: any;
  body_hash: string;
  prev_hash?: string;
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
  const [attachedLedgerEntries, setAttachedLedgerEntries] = useState<LedgerEntry[]>([]);
  const [pinQueue, setPinQueue] = useState<Array<{ messageId: string; content: string }>>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [mobileDrawerTab, setMobileDrawerTab] = useState<MobileTab | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { subscribed } = useSubscription();
  const { canSendMessage, remainingMessages, incrementUsage, DAILY_MESSAGE_LIMIT } = useUsageLimit();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  // Load sessions on mount and check for pinned ledger entries
  useEffect(() => {
    loadSessions();
    
    // Load web search preference from localStorage
    const savedWebSearch = localStorage.getItem('webSearchEnabled');
    if (savedWebSearch !== null) {
      setWebSearchEnabled(savedWebSearch === 'true');
    }
    
    // Check sessionStorage for pinned ledger entries
    const pinnedEntries = sessionStorage.getItem('pinnedLedgerEntries');
    if (pinnedEntries) {
      try {
        const entries = JSON.parse(pinnedEntries);
        setAttachedLedgerEntries(entries);
        sessionStorage.removeItem('pinnedLedgerEntries');
        toast({
          title: "Ledger entries attached",
          description: `${entries.length} memory(s) added to context`,
        });
      } catch (error) {
        console.error('Error loading pinned entries:', error);
      }
    }
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Auto-scroll to bottom (only when user is already near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messagesEndRef.current) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    if (distanceFromBottom < 100) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '44px';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120;
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [input]);

  // Detect pin in messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage.ledger && lastMessage.content.includes('📍')) {
      const pinIndex = lastMessage.content.indexOf('📍');
      const contentAfterPin = lastMessage.content.substring(pinIndex + 1, pinIndex + 151).trim();
      
      if (contentAfterPin.length > 0) {
        if (lastMessage.role === 'user') {
          saveToLedger(lastMessage.id, contentAfterPin);
          toast({
            title: "Memory Anchored",
            description: "Your pin has been saved to the ledger.",
          });
        } else {
          setPinQueue(prev => {
            const alreadyQueued = prev.some(p => p.messageId === lastMessage.id);
            if (alreadyQueued) return prev;
            return [...prev, { messageId: lastMessage.id, content: contentAfterPin }];
          });
        }
      }
    }
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
      setMobileDrawerTab(null); // Close drawer on mobile
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
          target_ai: targetAI
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
          return msg.ai_model === targetAI;
        } else {
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
    
    const messageWithContext = context ? `${context}\n\nUser Message: ${message}` : message;
    
    if (ai === 'deepseek') {
      const result = await streamDeepSeek(messageWithContext, conversationHistory);
      return { reply: result.response, tempId: result.tempId };
    } else if (ai === 'claude') {
      const result = await streamClaude(messageWithContext, conversationHistory);
      return { reply: result.response, tempId: result.tempId };
    } else if (ai === 'chatgpt') {
      const result = await streamOpenAI(messageWithContext, conversationHistory);
      return { reply: result.response, tempId: result.tempId };
    }
    
    throw new Error(`Unknown AI: ${ai}`);
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
          sessionId: currentSessionId,
          webSearchEnabled: webSearchEnabled
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

    return { response: fullResponse, tempId: tempMessageId };
  };

  const streamClaude = async (message: string, conversationHistory: any[]): Promise<{ response: string; tempId: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `https://ywohajmeijjiubesykcu.supabase.co/functions/v1/chat-claude`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          sessionId: currentSessionId,
          webSearchEnabled: webSearchEnabled
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Claude streaming error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) throw new Error('No reader available');

    const tempMessageId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempMessageId,
      content: '',
      role: 'assistant',
      ai_model: 'claude',
      created_at: new Date().toISOString()
    }]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text || '';
                fullResponse += delta;
                
                setMessages(prev => prev.map(msg =>
                  msg.id === tempMessageId
                    ? { ...msg, content: fullResponse }
                    : msg
                ));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Claude streaming error:', error);
      throw error;
    }

    return { response: fullResponse, tempId: tempMessageId };
  };

  const streamOpenAI = async (message: string, conversationHistory: any[]): Promise<{ response: string; tempId: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `https://ywohajmeijjiubesykcu.supabase.co/functions/v1/chat-openai`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          sessionId: currentSessionId,
          webSearchEnabled: webSearchEnabled
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI streaming error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) throw new Error('No reader available');

    const tempMessageId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempMessageId,
      content: '',
      role: 'assistant',
      ai_model: 'chatgpt',
      created_at: new Date().toISOString()
    }]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              fullResponse += delta;
              
              setMessages(prev => prev.map(msg =>
                msg.id === tempMessageId
                  ? { ...msg, content: fullResponse }
                  : msg
              ));
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw error;
    }

    return { response: fullResponse, tempId: tempMessageId };
  };

  const forwardMessage = async (content: string, fromAI: SpecificAI, toAI: SpecificAI) => {
    if (!currentSessionId) return;
    
    setLoading(true);
    try {
      const forwardPrompt = `[Forwarded from ${AI_CONFIGS[fromAI].name}]: ${content}`;
      
      const reply = await callAI(toAI, forwardPrompt);
      const replyContent = typeof reply === 'string' ? reply : reply.reply;
      await saveMessage(replyContent, 'assistant', toAI);
      
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

      let contentPreview = '';
      if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
        contentPreview = await file.text();
        if (contentPreview.length > 1000) {
          contentPreview = contentPreview.substring(0, 1000) + '...';
        }
      }

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

  useEffect(() => {
    if (currentSessionId) {
      loadChatFiles();
    } else {
      setChatFiles([]);
      setAttachedFiles([]);
    }
  }, [currentSessionId]);

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
    if (event.target) {
      event.target.value = '';
    }
  };

  const getContextForAI = () => {
    let context = '';
    
    if (attachedKnowledge.length > 0) {
      context += '\n--- Knowledge Base ---\n';
      attachedKnowledge.forEach(item => {
        context += `${item.title}:\n${item.content}\n\n`;
      });
    }

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

    if (attachedLedgerEntries.length > 0) {
      context += '\n--- Memory References ---\n';
      attachedLedgerEntries.forEach(entry => {
        context += `[${entry.type}] ${entry.agentId} (${entry.timestamp}):\n${entry.content}\n\n`;
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

  const removeAttachedLedgerEntry = (id: string) => {
    setAttachedLedgerEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const addBackKnowledge = (item: KnowledgeItem) => {
    setAttachedKnowledge(prev => [...prev, item]);
  };

  const addBackFile = (file: ChatFile) => {
    setAttachedFiles(prev => [...prev, file]);
  };

  const handleAttachLedgerEntry = (searchEntry: LedgerSearchEntry) => {
    // Transform from database format to internal format
    const entry: LedgerEntry = {
      id: searchEntry.id,
      content: typeof searchEntry.body_json === 'string' 
        ? searchEntry.body_json 
        : JSON.stringify(searchEntry.body_json),
      agentId: searchEntry.agent_id,
      type: searchEntry.entry_type,
      timestamp: searchEntry.created_at,
    };
    
    const alreadyAttached = attachedLedgerEntries.some(e => e.id === entry.id);
    if (alreadyAttached) {
      setAttachedLedgerEntries(prev => prev.filter(e => e.id !== entry.id));
    } else {
      setAttachedLedgerEntries(prev => [...prev, entry]);
    }
  };

  const exportChatSession = () => {
    if (!currentSessionId || messages.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No messages in current session",
        variant: "destructive",
      });
      return;
    }

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const sessionTitle = currentSession?.title || 'Chat Export';
    
    let exportContent = `# ${sessionTitle}\n`;
    exportContent += `Exported: ${new Date().toLocaleString()}\n\n---\n\n`;

    messages.forEach(msg => {
      const sender = msg.role === 'user' ? 'You' : AI_CONFIGS[msg.ai_model || 'chatgpt'].name;
      const timestamp = new Date(msg.created_at).toLocaleTimeString();
      exportContent += `**${sender}** (${timestamp}):\n${msg.content}\n\n`;
    });

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Chat exported as Markdown file",
    });
  };

  const saveToLedger = async (messageId: string, content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const message = messages.find(m => m.id === messageId);
      const agentId = message?.ai_model || 'user';
      
      const response = await fetch(
        `https://ywohajmeijjiubesykcu.supabase.co/functions/v1/save-to-ledger`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content,
            agentId,
            entryType: 'pin',
            shared: false
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save to ledger');
      }

      const result = await response.json();
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, ledger: { entry_id: result.id, body_hash: result.body_hash, prev_hash: result.prev_hash } }
          : msg
      ));

      setPinQueue(prev => prev.filter(p => p.messageId !== messageId));

      toast({
        title: "Saved to Memory Ledger",
        description: `Hash: ${result.body_hash.substring(0, 8)}...`,
      });
    } catch (error) {
      console.error('Error saving to ledger:', error);
      toast({
        title: "Error",
        description: "Failed to save to ledger",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId || loading) return;
    
    if (!subscribed && !canSendMessage) {
      toast({
        title: "Daily limit reached",
        description: "Please subscribe for unlimited messages",
        variant: "destructive",
      });
      return;
    }

    const message = input.trim();
    setInput("");
    setLoading(true);

    try {
      const savedUserMessage = await saveMessage(message, 'user', undefined, selectedAI);
      if (savedUserMessage) {
        setMessages(prev => [...prev, savedUserMessage]);
      }

      if (messages.length === 0) {
        const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
        updateSessionTitle(currentSessionId, title);
      }

      if (selectedAI === "all") {
        const ais: SpecificAI[] = ["chatgpt", "claude", "deepseek"];
        const aiPromises = ais.map(async (ai) => {
          try {
            const reply = await callAI(ai, message);
            const replyContent = typeof reply === 'string' ? reply : reply.reply;
            const tempId = typeof reply === 'object' ? reply.tempId : null;
            
            const savedMessage = await saveMessage(replyContent, 'assistant', ai);
            
            if (tempId && savedMessage) {
              setMessages(prev => prev.map(msg => 
                msg.id === tempId ? savedMessage : msg
              ));
            }
          } catch (error) {
            console.error(`Error with ${ai}:`, error);
            await saveMessage(`Error: ${(error as Error).message}`, 'assistant', ai);
          }
        });
        
        await Promise.all(aiPromises);
        await loadMessages(currentSessionId);
      } else {
        try {
          const reply = await callAI(selectedAI as SpecificAI, message);
          const replyContent = typeof reply === 'string' ? reply : reply.reply;
          const tempId = typeof reply === 'object' ? reply.tempId : null;
          
          const savedMessage = await saveMessage(replyContent, 'assistant', selectedAI as SpecificAI);
          
          if (tempId && savedMessage) {
            setMessages(prev => prev.map(msg => 
              msg.id === tempId ? savedMessage : msg
            ));
          } else {
            await loadMessages(currentSessionId);
          }
        } catch (error) {
          console.error(`Error with ${selectedAI}:`, error);
          await saveMessage(`Error: ${(error as Error).message}`, 'assistant', selectedAI as SpecificAI);
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

  // Sidebar Content Component (reused for both desktop and mobile)
  const SidebarContent = ({ tab }: { tab: string }) => {
    switch (tab) {
      case 'chats':
        return (
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
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setMobileDrawerTab(null);
                  }}
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
        );
      case 'knowledge':
        return (
          <div className="p-2 h-full">
            <KnowledgeManager 
              knowledgeBase={knowledgeBase} 
              onRefresh={loadKnowledgeBase}
            />
          </div>
        );
      case 'research':
        return (
          <div className="p-2 h-full">
            <ResearchLibrary />
          </div>
        );
      case 'memories':
        return (
          <LedgerSearcher
            onAttachEntry={handleAttachLedgerEntry}
            attachedEntryIds={attachedLedgerEntries.map(e => e.id)}
          />
        );
      default:
        return null;
    }
  };

  // Message Component
  const MessageItem = ({ message }: { message: Message }) => (
    <div
      className={cn(
        "flex gap-2 md:gap-3",
        message.role === 'user' ? "justify-end" : "justify-start"
      )}
    >
      {message.role === 'assistant' && message.ai_model && (
        <div className={cn(
          "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium flex-shrink-0",
          message.ai_model === "chatgpt" && "bg-chatgpt text-chatgpt-foreground",
          message.ai_model === "claude" && "bg-claude text-claude-foreground", 
          message.ai_model === "deepseek" && "bg-deepseek text-deepseek-foreground"
        )}>
          {AI_CONFIGS[message.ai_model].icon}
        </div>
      )}
      
      <Card className={cn(
        "p-2 md:p-3 max-w-[85%] md:max-w-2xl",
        message.role === 'user' 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-card"
      )}>
        {message.role === 'assistant' && message.ai_model && (
          <Badge 
            className={cn(
              "mb-1.5 md:mb-2 text-xs",
              message.ai_model === "chatgpt" && "bg-chatgpt/20 text-chatgpt border-chatgpt/30",
              message.ai_model === "claude" && "bg-claude/20 text-claude border-claude/30",
              message.ai_model === "deepseek" && "bg-deepseek/20 text-deepseek border-deepseek/30"
            )}
          >
            {AI_CONFIGS[message.ai_model].name}
          </Badge>
        )}
        <div className="flex items-start justify-between gap-2">
          {message.role === 'assistant' ? (
            <div className="text-xs md:text-sm prose prose-sm dark:prose-invert max-w-none flex-1">
              <Markdown
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-base md:text-lg font-semibold mt-4 mb-2 first:mt-0" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-sm md:text-base font-semibold mt-3 mb-2 first:mt-0" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xs md:text-sm font-semibold mt-3 mb-2 first:mt-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-4 md:pl-6 my-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-4 md:pl-6 my-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                  code: ({node, className, children, ...props}: any) => {
                    const isInline = !className?.includes('language-');
                    return isInline 
                      ? <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                      : <code className="block bg-muted p-2 md:p-3 rounded-lg overflow-x-auto text-xs font-mono" {...props}>{children}</code>;
                  },
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-3 md:pl-4 italic my-2 text-muted-foreground" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                }}
              >
                {message.content}
              </Markdown>
            </div>
          ) : (
            <p className="text-xs md:text-sm whitespace-pre-wrap flex-1">{message.content}</p>
          )}
          {message.role === 'assistant' && message.ai_model && !isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                  <Forward className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border z-[100]">
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
                {!message.ledger && (
                  <DropdownMenuItem
                    onClick={() => {
                      const content = message.content.includes('📍') 
                        ? message.content.substring(message.content.indexOf('📍') + 1, message.content.indexOf('📍') + 151).trim()
                        : message.content.substring(0, 150);
                      
                      setPinQueue(prev => {
                        const alreadyQueued = prev.some(p => p.messageId === message.id);
                        if (alreadyQueued) return prev;
                        return [...prev, { messageId: message.id, content }];
                      });
                    }}
                    className="gap-2"
                  >
                    📍 Save to Ledger
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {message.ledger && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(message.ledger!.body_hash);
                toast({
                  title: "Hash copied",
                  description: "Body hash copied to clipboard",
                });
              }}
            >
              🔗 {message.ledger.body_hash.substring(0, 8)}...
            </Badge>
          </div>
        )}
      </Card>
    </div>
  );

  // Input Area Component
  const InputArea = () => (
    <div className={cn(
      "p-3 md:p-4 border-t border-border bg-card/80 backdrop-blur-sm",
      isMobile && "pb-20" // Extra padding for bottom nav
    )}>
      {/* Attached items */}
      {(attachedKnowledge.length > 0 || attachedFiles.length > 0 || attachedLedgerEntries.length > 0) && (
        <div className="mb-3 p-2 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1.5">Context attached:</div>
          <div className="flex flex-wrap gap-1">
            {attachedKnowledge.map((item) => (
              <Badge key={item.id} variant="outline" className="text-xs group">
                📚 {item.title.substring(0, 15)}...
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
                {file.filename.substring(0, 12)}...
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
            {attachedLedgerEntries.map((entry) => (
              <Badge key={entry.id} variant="outline" className="text-xs group bg-purple-500/10 border-purple-500/30">
                🧠 {entry.type}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1 opacity-0 group-hover:opacity-100"
                  onClick={() => removeAttachedLedgerEntry(entry.id)}
                >
                  <X className="w-2 h-2" />
                </Button>
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
          className="shrink-0 h-10 w-10 p-0"
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
          placeholder={currentSessionId ? `Message ${selectedAI === "all" ? "all AIs" : AI_CONFIGS[selectedAI as keyof typeof AI_CONFIGS]?.name || selectedAI}...` : "Create or select a session"}
          disabled={loading || !currentSessionId}
          className="flex-1 bg-input border-border focus:ring-ring min-h-[40px] max-h-[100px] resize-none overflow-y-auto text-sm"
          rows={1}
        />
        <Button 
          onClick={handleSend} 
          disabled={loading || !input.trim() || !currentSessionId}
          className="bg-primary hover:bg-primary/90 h-10 w-10 p-0"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {/* Status badges */}
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {selectedAI === "all" ? "All AIs" : AI_CONFIGS[selectedAI as keyof typeof AI_CONFIGS]?.name || selectedAI}
        </Badge>
        
        {!subscribed && (
          <Badge 
            variant={remainingMessages <= 5 ? "destructive" : "outline"} 
            className="text-xs"
          >
            {remainingMessages === Infinity 
              ? "Unlimited" 
              : `${remainingMessages}/${DAILY_MESSAGE_LIMIT} left`
            }
          </Badge>
        )}
      </div>
    </div>
  );

  // Pin Queue Modal (simplified for both)
  const PinQueueModal = () => {
    if (pinQueue.length === 0) return null;
    const currentPin = pinQueue[0];
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="p-4 max-w-md w-full">
          <h3 className="font-semibold mb-2">Save to Memory Ledger?</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            "{currentPin.content}"
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPinQueue(prev => prev.slice(1))}>
              Skip
            </Button>
            <Button onClick={() => saveToLedger(currentPin.messageId, currentPin.content)}>
              Save
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] bg-gradient-primary">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <MobileAISelector selectedAI={selectedAI} onSelect={setSelectedAI} />
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Switch 
                id="web-search-mobile"
                checked={webSearchEnabled}
                onCheckedChange={(checked) => {
                  setWebSearchEnabled(checked);
                  localStorage.setItem('webSearchEnabled', String(checked));
                }}
                className="scale-90"
              />
              <span className="text-xs">🌐</span>
            </div>
            
            {currentSessionId && (
              <Button variant="ghost" size="sm" onClick={exportChatSession} className="h-8 w-8 p-0">
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {!currentSessionId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground p-4">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Tap + to start a new chat</p>
              </div>
            </div>
          ) : (
            <div ref={messagesContainerRef} className="h-full overflow-y-auto p-3 space-y-3">
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <InputArea />

        {/* Bottom Navigation */}
        <MobileBottomNav 
          activeTab={mobileDrawerTab}
          onTabChange={setMobileDrawerTab}
          onNewChat={createNewSession}
        />

        {/* Mobile Drawer */}
        <Drawer open={mobileDrawerTab !== null} onOpenChange={(open) => !open && setMobileDrawerTab(null)}>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="capitalize">{mobileDrawerTab}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden px-4 pb-4">
              {mobileDrawerTab && <SidebarContent tab={mobileDrawerTab} />}
            </div>
          </DrawerContent>
        </Drawer>

        <PinQueueModal />
      </div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <div className="flex h-[calc(100vh-120px)] bg-gradient-primary">
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
                <TabsTrigger value="research" className="flex-1">
                  <FileText className="w-4 h-4 mr-1" />
                  Research
                </TabsTrigger>
                <TabsTrigger value="memories" className="flex-1">
                  🧠 Memories
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="chats" className="flex-1 mt-0">
                <SidebarContent tab="chats" />
              </TabsContent>
              
              <TabsContent value="knowledge" className="flex-1 mt-0 overflow-hidden">
                <SidebarContent tab="knowledge" />
              </TabsContent>

              <TabsContent value="research" className="flex-1 mt-0 overflow-hidden">
                <SidebarContent tab="research" />
              </TabsContent>

              <TabsContent value="memories" className="flex-1 mt-0 overflow-hidden">
                <SidebarContent tab="memories" />
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
              <div className="flex gap-2 items-center">
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

            {/* Web Search Toggle Bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <Switch 
                id="web-search"
                checked={webSearchEnabled}
                onCheckedChange={(checked) => {
                  setWebSearchEnabled(checked);
                  localStorage.setItem('webSearchEnabled', String(checked));
                }}
              />
              <label 
                htmlFor="web-search" 
                className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
              >
                🌐 Web Search
                {webSearchEnabled && loading && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    (may search if needed)
                  </span>
                )}
              </label>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 flex flex-col overflow-hidden">
              {!currentSessionId ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a chat session or create a new one to start chatting</p>
                  </div>
                </div>
              ) : (
                <div ref={messagesContainerRef} className="space-y-4 max-w-4xl mx-auto overflow-y-auto flex-1">
                  {messages.map((message) => (
                    <MessageItem key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <InputArea />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <PinQueueModal />
    </div>
  );
}
