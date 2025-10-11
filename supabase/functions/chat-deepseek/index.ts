import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHAT-DEEPSEEK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { message, conversation_history = [], sessionId } = await req.json();
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    if (!deepseekApiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    let userId = null;
    let userEmail = null;
    let isSubscribed = false;

    // Check if user is authenticated and subscribed
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        userEmail = userData.user.email;
        logStep("Authenticated user found", { userId, email: userEmail });

        // Use service role client for usage operations
        const serviceSupabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );

        // Parallelize subscription check and usage check
        const [subscriptionResult, usageResult] = await Promise.all([
          supabaseClient
            .from('subscribers')
            .select('subscribed')
            .eq('user_id', userId)
            .maybeSingle(),
          serviceSupabase.rpc('get_daily_usage', { p_user_id: userId })
        ]);
        
        isSubscribed = subscriptionResult.data?.subscribed || false;
        logStep("Subscription status", { isSubscribed });

        // For non-subscribers, check usage limits
        if (!isSubscribed) {
          if (usageResult.error) {
            logStep("Error checking usage", { error: usageResult.error });
          }

          const usage = usageResult.data || 0;
          logStep("Current usage", { usage, limit: 20 });

          if (usage >= 20) {
            logStep("Usage limit exceeded");
            return new Response(JSON.stringify({ 
              error: 'Daily message limit reached. Please subscribe for unlimited access.',
              limitReached: true,
              usage,
              limit: 20
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 429,
            });
          }

          // Increment usage count for non-subscribers
          const { data: newUsage, error: incrementError } = await serviceSupabase
            .rpc('increment_daily_usage', { 
              p_user_id: userId
            });

          if (incrementError) {
            logStep("Error incrementing usage", { error: incrementError });
          } else {
            logStep("Usage incremented", { newUsage });
          }
        }
      }
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          ...conversation_history,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        stream: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek API error:', errorData);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
