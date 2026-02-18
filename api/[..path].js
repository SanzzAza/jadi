export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  try {
    // Extract path & query
    const { path, ...query } = req.query;
    const targetPath = Array.isArray(path) ? path.join('/') : path || '';

    // Build target URL
    const targetUrl = new URL(`https://captain.sapimu.au/${targetPath}`);
    Object.entries(query).forEach(([k, v]) => {
      targetUrl.searchParams.set(k, v);
    });

    // Forward request
    const headers = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers
    });

    const data = await response.text();

    // Response with CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.status(response.status).send(data);

  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: error.message });
  }
}
