import ChatInterface from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, User, Crown, Database } from "lucide-react";
import logo from "@/assets/logo.png";

const Index = () => {
  const { loading, user, signOut } = useAuth();
  const { isAdmin } = useRoles();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Tri-Chat Basecamp Logo" className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-foreground">Tri-Chat Basecamp</h1>
          </div>
          {user ? (
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
          ) : (
            <Button onClick={() => navigate("/auth")} size="sm">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In / Sign Up
            </Button>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 p-3 bg-card/30 border border-border/50 rounded-lg backdrop-blur-sm">
          <Badge variant="secondary" className="font-mono text-xs">
            Private Research Instance
          </Badge>
          <span className="text-sm text-muted-foreground">
            User-scoped memory • No public access
          </span>
        </div>
      </div>
      <ChatInterface />
    </div>
  );
};

export default Index;
