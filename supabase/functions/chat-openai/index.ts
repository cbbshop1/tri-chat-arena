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

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    // Use DuckDuckGo Instant Answer API (official, free, returns JSON)
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    logStep("Calling DuckDuckGo API", { query, apiUrl });
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    logStep("DuckDuckGo API response", { hasAbstract: !!data.Abstract, relatedTopicsCount: data.RelatedTopics?.length || 0 });
    
    const results: SearchResult[] = [];
    
    // Add main abstract if available
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText || data.Abstract,
        url: data.AbstractURL
      });
    }
    
    // Add related topics (these are often the most relevant results)
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        // Some topics are nested in "Topics" array
        if (topic.Topics && Array.isArray(topic.Topics)) {
          for (const subTopic of topic.Topics.slice(0, 3)) {
            if (subTopic.Text && subTopic.FirstURL && results.length < 5) {
              results.push({
                title: subTopic.Text.split(' - ')[0] || subTopic.Text.substring(0, 100),
                snippet: subTopic.Text,
                url: subTopic.FirstURL
              });
            }
          }
        } else if (topic.Text && topic.FirstURL && results.length < 5) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            snippet: topic.Text,
            url: topic.FirstURL
          });
        }
      }
    }
    
    // Add any additional results
    if (data.Results && Array.isArray(data.Results)) {
      for (const result of data.Results.slice(0, 3)) {
        if (result.Text && result.FirstURL && results.length < 5) {
          results.push({
            title: result.Text.split(' - ')[0] || result.Text.substring(0, 100),
            snippet: result.Text,
            url: result.FirstURL
          });
        }
      }
    }
    
    logStep("Parsed search results", { resultCount: results.length });
    
    return results;
  } catch (error) {
    logStep("Error searching DuckDuckGo", { error: error.message });
    return [];
  }
}

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }
  
  return results.map((r, i) => 
    `${i + 1}. **${r.title}**\n${r.snippet}\nSource: ${r.url}`
  ).join('\n\n');
}

const SYSTEM_PROMPT = 'You are a helpful AI assistant with access to web search. Use the web_search function when users explicitly ask about current events, recent news, breaking stories, today\'s information, or real-time data (weather, stocks, sports scores). Only search when the information is clearly time-sensitive and recent.';

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information, recent events, news, or facts. Use this when the user asks about recent events, current data, breaking news, or information that may have changed recently.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query (e.g., 'latest SpaceX launch', 'current weather NYC', 'recent AI news')"
          }
        },
        required: ["query"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { message, conversation_history = [], sessionId, webSearchEnabled = true } = await req.json();
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

    // Detect if user is asking for current/recent information
    const needsCurrentInfo = /\b(latest|current|today|now|recent|breaking|news|weather|stock|score|price|2025|2024|happening)\b/i.test(message);
    const toolChoice = needsCurrentInfo ? { type: "function", function: { name: "web_search" } } : "auto";
    
    // Only include tools if web search is enabled
    const activeTools = webSearchEnabled ? tools : undefined;

    // Step 1: Check if tool calling is needed (non-streaming initial call)
    logStep("Checking for tool calls", { webSearchEnabled });
    const initialResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversation_history,
          { role: 'user', content: message }
        ],
        ...(activeTools && { tools: activeTools }),
        ...(activeTools && { tool_choice: toolChoice }),
        stream: false
      }),
    });

    if (!initialResponse.ok) {
      const errorData = await initialResponse.text();
      console.error('OpenAI API error:', { status: initialResponse.status, statusText: initialResponse.statusText, error: errorData });
      throw new Error(`OpenAI API error: ${initialResponse.status} - ${errorData}`);
    }

    const initialData = await initialResponse.json();
    const toolCalls = initialData.choices[0].message.tool_calls;

    // Step 2: If tool called, execute search and make final call
    if (toolCalls && toolCalls.length > 0) {
      const searchQuery = JSON.parse(toolCalls[0].function.arguments).query;
      logStep("Executing web search", { query: searchQuery });
      
      const searchResults = await searchDuckDuckGo(searchQuery);
      const formattedResults = formatSearchResults(searchResults);
      logStep("Search completed", { resultCount: searchResults.length });
      
      // Make final call with search results
      const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conversation_history,
            { role: 'user', content: message },
            initialData.choices[0].message,
            {
              role: 'tool',
              tool_call_id: toolCalls[0].id,
              content: formattedResults
            }
          ],
          stream: true
        }),
      });

      if (!finalResponse.ok) {
        const errorData = await finalResponse.text();
        console.error('OpenAI API error:', { status: finalResponse.status, statusText: finalResponse.statusText, error: errorData });
        throw new Error(`OpenAI API error: ${finalResponse.status} - ${errorData}`);
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

    // No tool call needed, stream normally
    logStep("No tool calls, streaming response");
    const streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversation_history,
          { role: 'user', content: message }
        ],
        stream: true
      }),
    });

    if (!streamResponse.ok) {
      const errorData = await streamResponse.text();
      console.error('OpenAI API error:', { status: streamResponse.status, statusText: streamResponse.statusText, error: errorData });
      throw new Error(`OpenAI API error: ${streamResponse.status} - ${errorData}`);
    }

    return new Response(streamResponse.body, {
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
