import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHAT-CLAUDE] ${step}${detailsStr}`);
};

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    const braveApiKey = Deno.env.get('BRAVE_API_KEY');
    
    if (!braveApiKey) {
      logStep("Brave API key not configured, skipping search");
      return [];
    }
    
    const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    
    logStep("Calling Brave Search API", { query, apiUrl });
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveApiKey
      }
    });

    if (!response.ok) {
      logStep("Brave API error", { status: response.status, statusText: response.statusText });
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.web && data.web.results) {
      for (const result of data.web.results.slice(0, 5)) {
        results.push({
          title: result.title || 'No title',
          snippet: result.description || result.snippet || '',
          url: result.url
        });
      }
    }

    logStep("Parsed search results", { resultCount: results.length });
    return results;
  } catch (error) {
    logStep("Error searching", { error: error.message });
    return [];
  }
}

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }
  
  return results.map((result, index) => 
    `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.url}`
  ).join('\n\n');
}

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to current web information. When users ask about recent events, news, or time-sensitive information, use the web_search tool to get up-to-date information. After receiving search results, incorporate them naturally into your response and cite sources.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { message, conversation_history = [], sessionId, webSearchEnabled = false } = await req.json();
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    let userId = null;
    let userEmail = null;
    let isSubscribed = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        userEmail = userData.user.email;
        logStep("Authenticated user found", { userId, email: userEmail });

        const { data: subscriptionData } = await supabaseClient
          .from('subscribers')
          .select('subscribed')
          .eq('user_id', userId)
          .maybeSingle();
        
        isSubscribed = subscriptionData?.subscribed || false;
        logStep("Subscription status", { isSubscribed });
      }
    }

    if (!isSubscribed) {
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      const { data: currentUsage, error: usageError } = await serviceSupabase
        .rpc('get_daily_usage', { 
          p_user_id: userId
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

    const tools = [{
      name: "web_search",
      description: "Search the web for current events, news, or recent information. Use this when the user asks about recent, current, or time-sensitive information.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find current information"
          }
        },
        required: ["query"]
      }
    }];

    const shouldCheckForWebSearch = webSearchEnabled && 
      /\b(latest|current|today|recent|news|now|this (week|month|year)|2025|happening)\b/i.test(message);

    logStep("Web search check", { webSearchEnabled, shouldCheckForWebSearch });

    if (shouldCheckForWebSearch) {
      logStep("Checking if web search is needed");
      
      const checkResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [
            ...conversation_history,
            { role: 'user', content: message }
          ],
          tools: tools,
          stream: false
        }),
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.text();
        console.error('Anthropic API error:', errorData);
        throw new Error(`Anthropic API error: ${checkResponse.status}`);
      }

      const checkData = await checkResponse.json();
      logStep("Tool use check response", { hasToolUse: checkData.content?.some((c: any) => c.type === 'tool_use') });

      const toolUse = checkData.content?.find((c: any) => c.type === 'tool_use' && c.name === 'web_search');
      
      if (toolUse) {
        const searchQuery = toolUse.input.query;
        logStep("Executing web search", { query: searchQuery });
        
        const searchResults = await searchWeb(searchQuery);
        const formattedResults = formatSearchResults(searchResults);
        logStep("Search completed", { resultCount: searchResults.length });

        const finalResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicApiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: SYSTEM_PROMPT,
            messages: [
              ...conversation_history,
              { role: 'user', content: message },
              { role: 'assistant', content: checkData.content },
              { 
                role: 'user', 
                content: [{
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: formattedResults
                }]
              }
            ],
            stream: true
          }),
        });

        if (!finalResponse.ok) {
          const errorData = await finalResponse.text();
          console.error('Anthropic API error:', errorData);
          throw new Error(`Anthropic API error: ${finalResponse.status}`);
        }

        return new Response(finalResponse.body, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
        });
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          ...conversation_history,
          { role: 'user', content: message }
        ],
        stream: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', errorData);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

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
