export const config = {
  runtime: 'edge',
  regions: ['sin1'], // Singapore - lebih dekat ke API
};

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(request.url);
  
  // Health check
  if (url.pathname === '/api' || url.pathname === '/api/') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      time: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Extract path: /api/bilitv/api/v1/home -> bilitv/api/v1/home
  const pathAfterApi = url.pathname.replace(/^\/api\//, '');
  
  if (!pathAfterApi) {
    return new Response(JSON.stringify({ error: 'No path' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Build target URL with query params
  const targetUrl = new URL(`https://captain.sapimu.au/${pathAfterApi}`);
  url.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Accept': 'application/json',
        'User-Agent': 'CaptainSapimu/3.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return new Response(JSON.stringify({ 
      error: isTimeout ? 'Request timeout' : error.message,
      path: pathAfterApi,
    }), {
      status: isTimeout ? 504 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
