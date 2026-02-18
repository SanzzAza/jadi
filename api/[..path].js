export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  
  // Health check
  if (url.pathname === '/api' || url.pathname === '/api/') {
    return new Response(JSON.stringify({ status: 'ok', message: 'Proxy is working!' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Extract path after /api/
  const pathAfterApi = url.pathname.replace(/^\/api\//, '');
  
  if (!pathAfterApi) {
    return new Response(JSON.stringify({ error: 'No path provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Build target URL
  const targetUrl = new URL(`https://captain.sapimu.au/${pathAfterApi}`);
  
  // Copy query params
  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  try {
    // Forward request
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();

    // Return with CORS headers
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      targetUrl: targetUrl.toString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
