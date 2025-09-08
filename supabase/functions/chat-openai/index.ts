import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHAT-OPENAI] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { message, conversation_history = [], sessionId } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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

        // Check subscription status
        const { data: subscriptionData } = await supabaseClient
          .from('subscribers')
          .select('subscribed')
          .eq('user_id', userId)
          .maybeSingle();
        
        isSubscribed = subscriptionData?.subscribed || false;
        logStep("Subscription status", { isSubscribed });
      }
    }

    // For non-subscribers, check usage limits
    if (!isSubscribed) {
      // Use service role client for usage operations to bypass RLS securely
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      // Get current daily usage (only for authenticated users now)
      const { data: currentUsage, error: usageError } = await serviceSupabase
        .rpc('get_daily_usage', { 
          p_user_id: userId, 
          p_email: null // Removed email tracking for security
        });

      if (usageError) {
        logStep("Error checking usage", { error: usageError });
      }

      const usage = currentUsage || 0;
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
          p_user_id: userId, 
          p_email: null // Removed email tracking for security
        });

      if (incrementError) {
        logStep("Error incrementing usage", { error: incrementError });
      } else {
        logStep("Usage incremented", { newUsage });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          ...conversation_history,
          { role: 'user', content: message }
        ],
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-openai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});