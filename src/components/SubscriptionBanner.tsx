import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Crown, CreditCard } from "lucide-react";

export const SubscriptionBanner = () => {
  const { user } = useAuth();
  const { subscribed, loading, createCheckout, openCustomerPortal } = useSubscription();

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
        <Button onClick={createCheckout}>
          Subscribe $5/mo
        </Button>
      </CardContent>
    </Card>
  );
};