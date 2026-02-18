const axios = require('axios');

const BASE_URL = 'https://captain.sapimu.au';
const DEFAULT_TOKEN = '53d25de32c37b0fcd2b14a9f834050493cc044d5039b5aff3283da73a8ef761b';

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  if (!req.query.path) {
    return res.status(200).json({
      status: 'ok',
      service: 'Captain Sapimu Proxy',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { path } = req.query;
    
    // Get token from header or use default
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else {
      token = DEFAULT_TOKEN;
    }

    // Validate basic token format
    if (!token || token.length < 10) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    // Build target URL
    const targetUrl = `${BASE_URL}/${path}`;
    
    // Add query params if any (except 'path')
    const url = new URL(targetUrl);
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') {
        url.searchParams.set(key, value);
      }
    });

    console.log(`[PROXY] ${req.method} ${url.href}`);

    // Make request
    const response = await axios({
      method: req.method || 'GET',
      url: url.href,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Captain-Sapimu-Proxy/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 20000,
      ...(req.body && { data: req.body }),
      validateStatus: () => true // Accept any status
    });

    // Return response
    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error('[PROXY ERROR]:', error.message);
    
    // Return error response
    const statusCode = error.response?.status || 500;
    return res.status(statusCode).json({
      error: true,
      message: error.message,
      path: req.query.path,
      timestamp: new Date().toISOString()
    });
  }
};
