module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  var targetPath = req.query.path || '';

  if (!targetPath) {
    return res.status(200).json({ status: 'ok', message: 'Proxy running!' });
  }

  var params = [];
  Object.keys(req.query).forEach(function(k) {
    if (k !== 'path') {
      params.push(k + '=' + encodeURIComponent(req.query[k]));
    }
  });
  var qs = params.join('&');
  var targetUrl = 'https://captain.sapimu.au/' + targetPath + (qs ? '?' + qs : '');

  try {
    var response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9,id;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://captain.sapimu.au/',
        'Origin': 'https://captain.sapimu.au',
        'X-Requested-With': 'XMLHttpRequest',
      }
    });

    var data = await response.text();

    // Return diagnostic info jika error
    if (!response.ok) {
      return res.status(response.status).json({
        proxy_error: true,
        status: response.status,
        statusText: response.statusText,
        url: targetUrl,
        body: data.substring(0, 500)
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).send(data);
  } catch (e) {
    return res.status(500).json({ 
      proxy_error: true,
      error: e.message, 
      url: targetUrl 
    });
  }
};
