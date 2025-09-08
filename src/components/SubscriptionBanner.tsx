import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Crown, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const SubscriptionBanner = () => {
  const { user } = useAuth();
  const { subscribed, loading, createCheckout, openCustomerPortal } = useSubscription();
  const { toast } = useToast();

  // 🔓 DEVELOPER EMAILS: Users with these emails get unlimited access
  const DEVELOPER_EMAILS = ['cbbsherpa1@gmail.com', 'cbbsherpa@outlook.com'];
  const isDeveloperUser = user?.email && DEVELOPER_EMAILS.includes(user.email);
  
  if (isDeveloperUser) {
    return (
      <Card className="bg-gradient-to-r from-green-500/10 to-green-400/5 border-green-500/20">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-600">🔓 Developer Mode Active</p>
              <p className="text-sm text-muted-foreground">
                Unlimited AI access enabled for {user?.email}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            <CreditCard className="h-4 w-4 mr-2" />
            Dev Mode
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user || loading) return null;

  if (subscribed) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-primary">Premium Active</p>
              <p className="text-sm text-muted-foreground">
                You have full access to all AI models
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openCustomerPortal}>
            <CreditCard className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">Upgrade to Premium</p>
          <p className="text-sm text-muted-foreground">
            Get unlimited access to all AI models for just $5/month
          </p>
        </div>
        <Button onClick={async () => {
          // Test health first
          try {
            console.log("Testing edge function health...");
            const healthCheck = await supabase.functions.invoke('test-health');
            console.log('Health check result:', healthCheck);
            
            if (healthCheck.error) {
              toast({
                title: "System Health Issue",
                description: `Health check failed: ${healthCheck.error.message}`,
                variant: "destructive",
              });
              return;
            }
            
            toast({
              title: "System Health Check",
              description: "Edge functions are working! Proceeding with checkout...",
            });
          } catch (error) {
            console.error('Health check failed:', error);
            toast({
              title: "System Unavailable", 
              description: "Edge functions are not responding. Please try again later.",
              variant: "destructive",
            });
            return;
          }
          
          // If health check passes, proceed with checkout
          createCheckout();
        }}>
          Subscribe $5/mo
        </Button>
      </CardContent>
    </Card>
  );
};