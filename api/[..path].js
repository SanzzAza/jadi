export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get path from query
  const { slug } = req.query;
  
  // Health check
  if (!slug || slug.length === 0) {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Proxy is working!',
      time: new Date().toISOString()
    });
  }

  // Build target path
  const targetPath = Array.isArray(slug) ? slug.join('/') : slug;
  
  // Build query string (exclude 'slug')
  const queryParams = { ...req.query };
  delete queryParams.slug;
  const queryString = Object.entries(queryParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const targetUrl = `https://captain.sapimu.au/${targetPath}${queryString ? '?' + queryString : ''}`;

  console.log('Proxying to:', targetUrl);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Accept': 'application/json',
        'User-Agent': 'CaptainSapimu-Proxy/1.0',
      },
    });

    const data = await response.text();

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.status(response.status).send(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: error.message,
      targetUrl: targetUrl
    });
  }
}
