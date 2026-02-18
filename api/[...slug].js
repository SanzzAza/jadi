export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;

  if (!slug || slug.length === 0) {
    return res.status(200).json({ status: 'ok' });
  }

  const targetPath = Array.isArray(slug) ? slug.join('/') : slug;

  // Build query string tanpa slug
  const params = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'slug') params.set(k, v);
  });
  const qs = params.toString();
  const targetUrl = `https://captain.sapimu.au/${targetPath}${qs ? '?' + qs : ''}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.text();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(response.status).send(data);
  } catch (e) {
    return res.status(504).json({ error: e.name === 'AbortError' ? 'timeout' : e.message });
  }
}
