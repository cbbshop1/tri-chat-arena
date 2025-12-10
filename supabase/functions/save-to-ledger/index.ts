
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent IDs are now flexible - any non-empty string is accepted

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SAVE-TO-LEDGER] Function invoked');
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[SAVE-TO-LEDGER] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SAVE-TO-LEDGER] Authenticated user:', user.id);
    
    // Parse the incoming request body
    const requestBody = await req.json();
    console.log('[SAVE-TO-LEDGER] Request body:', JSON.stringify(requestBody, null, 2));
    
    const { agent_id, entry_type, body_json } = requestBody;

    // Validate agent_id - accept any non-empty string
    if (!agent_id || typeof agent_id !== 'string' || agent_id.trim().length === 0) {
      console.error('[SAVE-TO-LEDGER] Invalid agent_id:', agent_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'agent_id is required and must be a non-empty string' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[SAVE-TO-LEDGER] agent_id validated:', agent_id);

    // Validate entry_type
    if (!entry_type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'entry_type is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate body_json structure
    if (!body_json || typeof body_json !== 'object') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'body_json must be a valid JSON object' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for required fields in body_json - accept either new format or old format
    const hasNewFormat = body_json.content && body_json.actor;
    const hasOldFormat = body_json.id && body_json.t && body_json.actor && body_json.summary;
    
    if (!hasNewFormat && !hasOldFormat) {
      console.error('[SAVE-TO-LEDGER] Invalid body_json format:', body_json);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'body_json must contain either {content, actor} or {id, t, actor, summary}' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[SAVE-TO-LEDGER] All validations passed');

    // Sanitize body_json to fix invalid Unicode characters
    const sanitizedBodyJson = JSON.parse(
      JSON.stringify(body_json)
        .replace(/\\udccd/g, '📍')  // Replace invalid surrogate with actual emoji
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // Remove control characters
    );
    console.log('[SAVE-TO-LEDGER] Sanitized body_json');

    // Create Supabase client with service role key
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceRoleKey) {
      throw new Error('Missing service role key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Insert into ledger_entries with user_id
    // The trigger will automatically compute body_hash and prev_hash
    console.log('[SAVE-TO-LEDGER] Inserting into ledger_entries for user:', user.id);
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({ 
        agent_id, 
        entry_type, 
        body_json: sanitizedBodyJson,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('[SAVE-TO-LEDGER] Database error:', error);
      throw error;
    }
    
    console.log('[SAVE-TO-LEDGER] Successfully inserted, data:', data);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        ledger_entry_id: data.id,
        body_hash: data.body_hash,
        prev_hash: data.prev_hash
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('[SAVE-TO-LEDGER] Caught error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SAVE-TO-LEDGER] Error message:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
