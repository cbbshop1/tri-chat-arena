import ChatInterface from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, User, Crown, Database, Menu } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const { loading, user, signOut } = useAuth();
  const { isAdmin } = useRoles();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  console.log("Auth state:", { loading, user: !!user, email: user?.email });

  if (loading) {
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
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      <div className="container mx-auto py-2 md:py-4 px-3 md:px-4">
        <div className="flex justify-between items-center mb-2 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <img src={logo} alt="Tri-Chat Basecamp Logo" className="w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-lg md:text-2xl font-bold text-foreground">
              {isMobile ? "Tri-Chat" : "Tri-Chat Basecamp"}
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          {!isMobile && user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                {user.email}
              </div>
              <Button variant="outline" onClick={() => navigate("/memories")} size="sm">
                <Database className="w-4 h-4 mr-2" />
                Memory Ledger
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate("/admin")} size="sm">
                  <Crown className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={signOut} size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
          
          {/* Mobile Navigation */}
          {isMobile && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border z-[100]">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[200px]">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/memories")}>
                  <Database className="w-4 h-4 mr-2" />
                  Memory Ledger
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Crown className="w-4 h-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {!user && (
            <Button onClick={() => navigate("/auth")} size="sm">
              <LogIn className="w-4 h-4 mr-2" />
              {isMobile ? "Sign In" : "Sign In / Sign Up"}
            </Button>
          )}
        </div>
        
        {/* Instance badge - hide on mobile */}
        {!isMobile && (
          <div className="flex items-center justify-center gap-2 p-3 bg-card/30 border border-border/50 rounded-lg backdrop-blur-sm">
            <Badge variant="secondary" className="font-mono text-xs">
              Private Research Instance
            </Badge>
            <span className="text-sm text-muted-foreground">
              User-scoped memory • No public access
            </span>
          </div>
        )}
      </div>
      <ChatInterface />
    </div>
  );
};

export default Index;
