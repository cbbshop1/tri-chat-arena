import { MessageSquare, Bot, FileText, Brain, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'chats' | 'knowledge' | 'research' | 'memories';

interface MobileBottomNavProps {
  activeTab: TabType | null;
  onTabChange: (tab: TabType) => void;
  onNewChat: () => void;
}

export function MobileBottomNav({ activeTab, onTabChange, onNewChat }: MobileBottomNavProps) {
  const tabs = [
    { id: 'chats' as TabType, icon: MessageSquare, label: 'Chats' },
    { id: 'knowledge' as TabType, icon: Bot, label: 'Knowledge' },
    { id: 'research' as TabType, icon: FileText, label: 'Research' },
    { id: 'memories' as TabType, icon: Brain, label: 'Memories' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(activeTab === tab.id ? null as any : tab.id)}
            className={cn(
              "flex flex-col items-center justify-center h-full px-4 min-w-[64px] transition-colors",
              activeTab === tab.id 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={onNewChat}
          className="flex flex-col items-center justify-center h-full px-4 min-w-[64px] text-primary"
        >
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center -mt-2">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
        </button>
      </div>
    </div>
  );
}
