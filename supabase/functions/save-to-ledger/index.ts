
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_AGENT_IDS = ['C', 'CL', 'DS', 'GP', 'GM', 'LL', 'GK', 'ME', 'MS'];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the incoming request body
    const requestBody = await req.json();
    const { agent_id, entry_type, body_json } = requestBody;

    // Validate agent_id
    if (!agent_id || !VALID_AGENT_IDS.includes(agent_id)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid agent_id. Must be one of: ${VALID_AGENT_IDS.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Check for required fields in body_json
    const requiredFields = ['id', 't', 'actor', 'summary'];
    const missingFields = requiredFields.filter(field => !body_json[field]);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `body_json missing required fields: ${missingFields.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Insert into ledger_entries
    // The trigger will automatically compute body_hash and prev_hash
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({ 
        agent_id, 
        entry_type, 
        body_json 
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

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
    console.error('Error in save-to-ledger:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
