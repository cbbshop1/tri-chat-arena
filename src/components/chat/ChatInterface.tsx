import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, Users, Forward } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export type AIModel = "chatgpt" | "claude" | "deepseek" | "all";
export type SpecificAI = Exclude<AIModel, "all">;

export interface Message {
  id: string;
  content: string;
  sender: "user" | SpecificAI;
  timestamp: Date;
  forwarded?: boolean;
}

const AI_CONFIGS = {
  chatgpt: {
    name: "ChatGPT",
    color: "chatgpt",
    icon: "🤖"
  },
  claude: {
    name: "Claude",
    color: "claude", 
    icon: "🧠"
  },
  deepseek: {
    name: "DeepSeek",
    color: "deepseek",
    icon: "🔍"
  }
} as const;

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedAI, setSelectedAI] = useState<AIModel>("all");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const callAI = async (ai: SpecificAI, message: string): Promise<string> => {
    const functionName = `chat-${ai === 'chatgpt' ? 'openai' : ai}`;
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { message }
    });

    if (error) {
      console.error(`Error calling ${ai}:`, error);
      toast({
        title: "Error",
        description: `Failed to get response from ${AI_CONFIGS[ai].name}`,
        variant: "destructive",
      });
      throw error;
    }

    return data.reply;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (selectedAI === "all") {
        // Call all AIs in parallel
        const aiPromises = Object.keys(AI_CONFIGS).map(async (ai) => {
          try {
            const reply = await callAI(ai as SpecificAI, input);
            return {
              id: `${Date.now()}-${ai}`,
              content: reply,
              sender: ai as SpecificAI,
              timestamp: new Date()
            };
          } catch (error) {
            return {
              id: `${Date.now()}-${ai}`,
              content: `Error: Failed to get response from ${AI_CONFIGS[ai as keyof typeof AI_CONFIGS].name}`,
              sender: ai as SpecificAI,
              timestamp: new Date()
            };
          }
        });

        const responses = await Promise.all(aiPromises);
        setMessages(prev => [...prev, ...responses]);
      } else {
        // Call specific AI
        const specificAI = selectedAI as SpecificAI;
        try {
          const reply = await callAI(specificAI, input);
          const response: Message = {
            id: `${Date.now()}-response`,
            content: reply,
            sender: specificAI,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, response]);
        } catch (error) {
          // Error already handled in callAI function
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForward = async (messageId: string, targetAI: Exclude<AIModel, "all">) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || isLoading) return;

    const forwardedMessage: Message = {
      id: `${Date.now()}-forwarded`,
      content: `Forwarded message: "${message.content}"`,
      sender: "user",
      timestamp: new Date(),
      forwarded: true
    };

    setMessages(prev => [...prev, forwardedMessage]);
    setIsLoading(true);

    try {
      const reply = await callAI(targetAI, `Please respond to this forwarded message: "${message.content}"`);
      const response: Message = {
        id: `${Date.now()}-forward-response`,
        content: reply,
        sender: targetAI,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
    } catch (error) {
      // Error already handled in callAI function
    } finally {
      setIsLoading(false);
    }

    setSelectedMessage(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-glow bg-clip-text text-transparent">
              Multi-AI Chat
            </h1>
          </div>
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
          {Object.entries(AI_CONFIGS).map(([key, config]) => (
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
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 group",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.sender !== "user" && (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  message.sender === "chatgpt" && "bg-chatgpt text-chatgpt-foreground",
                  message.sender === "claude" && "bg-claude text-claude-foreground", 
                  message.sender === "deepseek" && "bg-deepseek text-deepseek-foreground"
                )}>
                  {AI_CONFIGS[message.sender as keyof typeof AI_CONFIGS]?.icon || "🤖"}
                </div>
              )}
              
              <Card className={cn(
                "p-3 max-w-2xl relative",
                message.sender === "user" 
                  ? "bg-primary text-primary-foreground ml-auto" 
                  : "bg-card",
                message.forwarded && "border-l-4 border-yellow-500"
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {message.sender !== "user" && (
                      <Badge 
                        className={cn(
                          "mb-2 text-xs",
                          message.sender === "chatgpt" && "bg-chatgpt/20 text-chatgpt border-chatgpt/30",
                          message.sender === "claude" && "bg-claude/20 text-claude border-claude/30",
                          message.sender === "deepseek" && "bg-deepseek/20 text-deepseek border-deepseek/30"
                        )}
                      >
                        {AI_CONFIGS[message.sender as keyof typeof AI_CONFIGS]?.name}
                      </Badge>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {message.sender !== "user" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
                    >
                      <Forward className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                {selectedMessage === message.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Forward to:</p>
                    <div className="flex gap-2">
                      {Object.entries(AI_CONFIGS)
                        .filter(([key]) => key !== message.sender)
                        .map(([key, config]) => (
                        <Button
                          key={key}
                          size="sm"
                          variant="outline"
                          onClick={() => handleForward(message.id, key as SpecificAI)}
                          className="text-xs"
                        >
                          {config.icon} {config.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${selectedAI === "all" ? "all AIs" : AI_CONFIGS[selectedAI as keyof typeof AI_CONFIGS]?.name || selectedAI}...`}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-input border-border focus:ring-ring"
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
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
  );
}