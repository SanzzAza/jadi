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
        'Accept': 'application/json'
      }
    });

    var data = await response.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(response.status).send(data);
  } catch (e) {
    return res.status(500).json({ error: e.message, url: targetUrl });
  }
};
