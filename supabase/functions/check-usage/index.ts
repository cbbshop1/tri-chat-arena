import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role key to bypass RLS for reading usage data
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    let userId = null;
    let userEmail = null;

    // Try to get authenticated user
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        userEmail = userData.user.email;
        logStep("Authenticated user found", { userId, email: userEmail });
      }
    }

    // For anonymous users, use session identifier from request body
    if (!userId) {
      const { sessionId } = await req.json();
      userEmail = sessionId || 'anonymous';
      logStep("Anonymous user", { sessionId: userEmail });
    }

    // Get current daily usage
    const { data: usageData, error: usageError } = await supabaseClient
      .rpc('get_daily_usage', { 
        p_user_id: userId, 
        p_email: userEmail 
      });

    if (usageError) {
      logStep("Error getting usage", { error: usageError });
      throw usageError;
    }

    const currentUsage = usageData || 0;
    const limit = 20; // Daily message limit for non-subscribers
    const remaining = Math.max(0, limit - currentUsage);

    logStep("Usage checked", { currentUsage, limit, remaining });

    return new Response(JSON.stringify({
      currentUsage,
      limit,
      remaining,
      canSendMessage: remaining > 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-usage", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});