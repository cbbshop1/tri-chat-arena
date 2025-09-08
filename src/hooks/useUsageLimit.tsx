import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";

const DAILY_MESSAGE_LIMIT = 20;

// 🔓 DEVELOPER EMAILS: Users with these emails get unlimited access
const DEVELOPER_EMAILS = ['cbbsherpa1@gmail.com', 'cbbsherpa@outlook.com'];

export const useUsageLimit = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const [dailyUsage, setDailyUsage] = useState(0);
  const [loading, setLoading] = useState(true);

  const isDeveloperUser = () => {
    return user?.email && DEVELOPER_EMAILS.includes(user.email);
  };

  const checkDailyUsage = async () => {
    if (isDeveloperUser()) {
      console.log("🔓 DEVELOPER MODE: Usage checks bypassed for", user?.email);
      setDailyUsage(0);
      setLoading(false);
      return;
    }

    if (subscribed) {
      setDailyUsage(0);
      setLoading(false);
      return;
    }

    try {
      const identifier = user?.id || 'anonymous';
      
      const { data, error } = await supabase.rpc('get_daily_usage', {
        p_user_id: user?.id || null,
        p_email: user?.email || identifier
      });

      if (error) throw error;
      setDailyUsage(data || 0);
    } catch (error) {
      console.error('Error checking daily usage:', error);
      setDailyUsage(0);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (isDeveloperUser()) {
      console.log("🔓 DEVELOPER MODE: Usage increment bypassed for", user?.email);
      return true;
    }

    if (subscribed) return true;

    try {
      const identifier = user?.id || 'anonymous';
      
      const { data, error } = await supabase.rpc('increment_daily_usage', {
        p_user_id: user?.id || null,
        p_email: user?.email || identifier
      });

      if (error) throw error;
      
      const newCount = data || 0;
      setDailyUsage(newCount);
      
      return newCount <= DAILY_MESSAGE_LIMIT;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  const canSendMessage = () => {
    if (isDeveloperUser()) return true;
    if (subscribed) return true;
    return dailyUsage < DAILY_MESSAGE_LIMIT;
  };

  const remainingMessages = () => {
    if (isDeveloperUser()) return 999; // Show high number in dev mode
    if (subscribed) return Infinity;
    return Math.max(0, DAILY_MESSAGE_LIMIT - dailyUsage);
  };

  useEffect(() => {
    checkDailyUsage();
  }, [user, subscribed]);

  return {
    dailyUsage: isDeveloperUser() ? 0 : dailyUsage,
    loading,
    canSendMessage: canSendMessage(),
    remainingMessages: remainingMessages(),
    incrementUsage,
    checkDailyUsage,
    DAILY_MESSAGE_LIMIT,
    isDeveloperMode: isDeveloperUser()
  };
};