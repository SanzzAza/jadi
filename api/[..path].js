export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  const { path } = req.query;
  if (!path || path.length === 0) {
    return res.status(200).json({ status: 'ok', message: 'Proxy working!' });
  }

  // Build path
  const targetPath = Array.isArray(path) ? path.join('/') : path;
  const queryString = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const targetUrl = `https://captain.sapimu.au/${targetPath}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();
    
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(data);

  } catch (error) {
    res.status(500).json({ 
      error: error.message, 
      url: targetUrl 
    });
  }
}
