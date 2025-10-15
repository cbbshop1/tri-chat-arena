import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";

const DAILY_MESSAGE_LIMIT = 20;

export const useUsageLimit = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const [dailyUsage, setDailyUsage] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkDailyUsage = async () => {
    if (subscribed) {
      setDailyUsage(0);
      setLoading(false);
      return;
    }

    // Only check usage for authenticated users
    if (!user?.id) {
      setDailyUsage(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_daily_usage', {
        p_user_id: user.id
      });

      if (error) throw error;
      setDailyUsage(data || 0);
    } catch (error) {
      console.error('Error checking daily usage:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
      setDailyUsage(0);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (subscribed) return true;

    // Only allow usage tracking for authenticated users
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('increment_daily_usage', {
        p_user_id: user.id
      });

      if (error) throw error;
      
      const newCount = data || 0;
      setDailyUsage(newCount);
      
      return newCount <= DAILY_MESSAGE_LIMIT;
    } catch (error) {
      console.error('Error incrementing usage:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
      return false;
    }
  };

  const canSendMessage = () => {
    if (subscribed) return true;
    return dailyUsage < DAILY_MESSAGE_LIMIT;
  };

  const remainingMessages = () => {
    if (subscribed) return Infinity;
    return Math.max(0, DAILY_MESSAGE_LIMIT - dailyUsage);
  };

  useEffect(() => {
    // Only check usage if we have a user or if user is explicitly null (not loading)
    if (user !== undefined) {
      checkDailyUsage();
    }
  }, [user, subscribed]);

  return {
    dailyUsage,
    loading,
    canSendMessage: canSendMessage(),
    remainingMessages: remainingMessages(),
    incrementUsage,
    checkDailyUsage,
    DAILY_MESSAGE_LIMIT
  };
};