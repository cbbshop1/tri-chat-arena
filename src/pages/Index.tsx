import ChatInterface from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

const Index = () => {
  const { loading } = useAuth();

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
        <SubscriptionBanner />
      </div>
      <ChatInterface />
    </div>
  );
};

export default Index;
