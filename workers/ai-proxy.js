export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const requestBody = await request.json();

      const apiKey = requestBody.api_key || env.OPENAI_API_KEY || 'sk-nohwayoqctuijqcxmfhpmauuavpwskqxjnwmavxsdokqiqft';
      const baseUrl = requestBody.base_url || env.OPENAI_BASE_URL || 'https://api.siliconflow.cn';
      const model = requestBody.model || env.OPENAI_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
      const userPrompt = requestBody.prompt || env.DEFAULT_PROMPT || 'You are a text paraphrasing assistant. Your task is to rewrite the text while maintaining the same meaning but using different expressions. Maintain professionalism and fluency while ensuring accuracy.';
      const userContent = requestBody.content;

      if (!userContent) {
        return new Response(JSON.stringify({ error: { message: 'Missing content in request body' } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const aiRequestBody = {
        model: model,
        messages: [
          { role: 'system', content: userPrompt },
          { role: 'user', content: userContent },
        ],
        // Add other parameters like temperature, max_tokens if needed by the target API
        // stream: false, // Example: if you want to disable streaming
      };

      // Construct the target API URL
      // Ensure the baseUrl ends with a / if the endpoint doesn't start with one, or vice-versa.
      const endpoint = '/v1/chat/completions'; // Common endpoint for chat completions
      const targetUrl = `${baseUrl.replace(/\/$/, '')}${endpoint}`;

      const aiResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiRequestBody),
      });

      const aiResponseData = await aiResponse.json();

      // Forward the AI's response, ensuring CORS headers are set
      return new Response(JSON.stringify(aiResponseData), {
        status: aiResponse.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (error) {
      console.error('Error in Worker:', error);
      return new Response(JSON.stringify({ error: { message: error.message || 'An internal server error occurred' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allow these headers
};

function handleOptions(request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS preflight requests.
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'POST, OPTIONS',
      },
    });
  }
}