import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type AIModel = "chatgpt" | "claude" | "deepseek" | "all";

const AI_CONFIGS = {
  chatgpt: { name: "ChatGPT", color: "chatgpt", icon: "🤖" },
  claude: { name: "Claude", color: "claude", icon: "🧠" },
  deepseek: { name: "DeepSeek", color: "deepseek", icon: "🔍" },
  all: { name: "All AIs", color: "gradient-glow", icon: "🌟" }
};

interface MobileAISelectorProps {
  selectedAI: AIModel;
  onSelect: (ai: AIModel) => void;
}

export function MobileAISelector({ selectedAI, onSelect }: MobileAISelectorProps) {
  const currentConfig = AI_CONFIGS[selectedAI];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "gap-2",
            selectedAI === "all" && "bg-gradient-glow text-white border-0"
          )}
        >
          {selectedAI === "all" ? (
            <Users className="w-4 h-4" />
          ) : (
            <span>{currentConfig.icon}</span>
          )}
          <span className="max-w-[80px] truncate">{currentConfig.name}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-card border-border z-[100]">
        <DropdownMenuItem onClick={() => onSelect("all")} className="gap-2">
          <Users className="w-4 h-4" />
          All AIs
        </DropdownMenuItem>
        {Object.entries(AI_CONFIGS)
          .filter(([key]) => key !== 'all')
          .map(([key, config]) => (
            <DropdownMenuItem 
              key={key} 
              onClick={() => onSelect(key as AIModel)}
              className="gap-2"
            >
              <span>{config.icon}</span>
              {config.name}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
