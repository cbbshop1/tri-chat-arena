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

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

const searchWeb = async (query: string): Promise<SearchResult[]> => {
  const braveApiKey = Deno.env.get('BRAVE_API_KEY');
  if (!braveApiKey) {
    logStep("Brave API key not configured");
    return [];
  }

  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=5`;
  
  logStep("Calling Brave Search API", { query, apiUrl });

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveApiKey,
      },
    });

    if (!response.ok) {
      logStep("Brave API error", { status: response.status, statusText: response.statusText });
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = (data.web?.results || []).map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description,
    }));

    logStep("Parsed search results", { resultCount: results.length });
    return results;
  } catch (error) {
    logStep("Error during web search", { error: error.message });
    return [];
  }
};

const formatSearchResults = (results: SearchResult[]): string => {
  if (results.length === 0) {
    return "No search results found.";
  }

  let formatted = "Here are the current search results:\n\n";
  results.forEach((result, index) => {
    formatted += `${index + 1}. ${result.title}\n`;
    formatted += `   URL: ${result.url}\n`;
    formatted += `   ${result.description}\n\n`;
  });

  return formatted;
};

const SYSTEM_PROMPT = `You are a helpful AI assistant. When users ask about current events, recent news, or time-sensitive information (indicated by words like "latest", "current", "today", "recent", "news"), you should use the web_search tool to find up-to-date information before responding.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { message, conversation_history = [], sessionId, webSearchEnabled } = await req.json();
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

    // Define tools for web search
    const tools = [{
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for current events, news, or recent information. Use this when the user asks about latest, current, or time-sensitive information.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to find current information"
            }
          },
          required: ["query"]
        }
      }
    }];

    // Build messages array with system prompt
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation_history,
      { role: 'user', content: message }
    ];

    // Only use tools if web search is enabled
    const shouldUseTools = webSearchEnabled === true;
    logStep("Checking for tool calls", { webSearchEnabled: shouldUseTools });

    if (shouldUseTools) {
      // Step 1: Make initial call to check if tool should be used (non-streaming)
      const initialResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          tools,
          temperature: 0.7,
          stream: false
        }),
      });

      if (!initialResponse.ok) {
        const errorData = await initialResponse.text();
        logStep('DeepSeek initial API error', { status: initialResponse.status, error: errorData });
        throw new Error(`DeepSeek API error: ${initialResponse.status}`);
      }

      const initialData = await initialResponse.json();
      const toolCalls = initialData.choices?.[0]?.message?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        logStep("Tool calls detected", { toolCalls });

        // Process tool calls
        const toolMessages = [...messages];
        toolMessages.push(initialData.choices[0].message);

        for (const toolCall of toolCalls) {
          if (toolCall.function.name === 'web_search') {
            const args = JSON.parse(toolCall.function.arguments);
            const query = args.query;

            logStep("Executing web search", { query });

            const searchResults = await searchWeb(query);
            logStep("Search completed", { resultCount: searchResults.length });

            const formattedResults = formatSearchResults(searchResults);

            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: formattedResults
            });
          }
        }

        // Step 2: Make final call with search results (streaming)
        const finalResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepseekApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: toolMessages,
            temperature: 0.7,
            stream: true
          }),
        });

        if (!finalResponse.ok) {
          const errorData = await finalResponse.text();
          logStep('DeepSeek final API error', { status: finalResponse.status, error: errorData });
          throw new Error(`DeepSeek API error: ${finalResponse.status}`);
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

    // No tool calls or web search disabled - proceed with normal streaming
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        stream: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logStep('DeepSeek API error', { status: response.status, error: errorData });
      throw new Error(`DeepSeek API error: ${response.status}`);
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
    logStep("Error in function", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
