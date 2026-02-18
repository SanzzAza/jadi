export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetPath = req.query.path;

  if (!targetPath) {
    return res.status(200).json({ status: 'ok', message: 'Proxy running!' });
  }

  // Build query string (tanpa 'path')
  const params = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'path') params.set(k, v);
  });
  const qs = params.toString();
  const targetUrl = `https://captain.sapimu.au/${targetPath}${qs ? '?' + qs : ''}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Accept': 'application/json',
      },
    });

    const data = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(response.status).send(data);
  } catch (e) {
    return res.status(500).json({ error: e.message, url: targetUrl });
  }
}
