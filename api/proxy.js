import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const BASE_URL = 'https://captain.sapimu.au';
const DEFAULT_TOKEN = '53d25de32c37b0fcd2b14a9f834050493cc044d5039b5aff3283da73a8ef761b';
const REQUEST_TIMEOUT = 25000;
const MAX_RETRIES = 2;

// Platform configurations untuk optimasi
const PLATFORM_CONFIGS = {
  dramadash: {
    baseUrl: 'https://www.dramadash.app/api/',
    needsAuth: true,
    customHeaders: {
      'app-version': 70,
      'platform': 'android',
      'device-type': 'phone'
    }
  },
  reelshort: {
    baseUrl: 'https://api.reelshort.com/',
    needsAuth: true,
    customHeaders: {
      'app-version': 80,
      'lang': 'id'
    }
  },
  dramabox: {
    baseUrl: 'https://api.dramabox.com/',
    needsAuth: true
  }
  // Add more platform optimizations as needed
};

/**
 * Generate device ID untuk authentication
 */
function generateDeviceId() {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

/**
 * Get optimized headers berdasarkan platform
 */
function getOptimizedHeaders(platform, token) {
  const config = PLATFORM_CONFIGS[platform];
  const defaultHeaders = {
    'User-Agent': 'Captain-Sapimu-Proxy/3.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=UTF-8',
    'Accept-Encoding': 'gzip, deflate',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (config?.customHeaders) {
    Object.assign(defaultHeaders, config.customHeaders);
  }

  return defaultHeaders;
}

/**
 * Retry mechanism untuk failed requests
 */
async function retryRequest(requestFn, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        break;
      }
      
      // Wait before retry (exponential backoff)
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
}

/**
 * Smart platform detection dan routing
 */
function detectPlatformFromPath(path) {
  const pathParts = path.split('/');
  const potentialPlatform = pathParts[0]?.toLowerCase();
  
  // Check if it's a known platform
  const knownPlatforms = [
    'bilitv', 'cashdrama', 'dotdrama', 'dramabite', 'dramabox', 'dramadash',
    'dramanow', 'dramanova', 'dramapops', 'dramarush', 'dramawave', 'dreamshort',
    'flickreels', 'flickshort', 'flextv', 'freereels', 'fundrama', 'goodshort',
    'hishort', 'idrama', 'kalostv', 'melolo', 'meloshort', 'microdrama',
    'minutedrama', 'mydrama', 'netshort', 'radreels', 'rapidtv', 'reelife',
    'reelshort', 'shorten', 'shortbox', 'shortmax', 'shortsky', 'shotshort',
    'snackshort', 'sodareels', 'stardusttv', 'starshort', 'velolo', 'vigloo'
  ];
  
  if (knownPlatforms.includes(potentialPlatform)) {
    return {
      platform: potentialPlatform,
      endpoint: pathParts.slice(1).join('/')
    };
  }
  
  return {
    platform: null,
    endpoint: path
  };
}

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  const startTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Origin, User-Agent');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (!req.query.path) {
    return res.status(200).json({
      status: 'ok',
      service: 'Captain Sapimu API Proxy',
      version: '3.0.0',
      platforms: 42,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      region: process.env.VERCEL_REGION || 'unknown'
    });
  }

  try {
    const { path } = req.query;
    const method = req.method || 'GET';
    const requestBody = req.body;
    
    // Extract token from headers atau gunakan default
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || token.length < 10) {
      token = DEFAULT_TOKEN;
    }

    // Validate token format (basic validation)
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(401).json({
        error: 'Invalid token format',
        message: 'Token must be 64-character hexadecimal string'
      });
    }

    // Detect platform dan optimize routing
    const { platform, endpoint } = detectPlatformFromPath(path);
    const platformConfig = PLATFORM_CONFIGS[platform];
    
    // Build target URL
    let targetUrl;
    if (platformConfig?.baseUrl) {
      targetUrl = `${platformConfig.baseUrl}${endpoint}`;
    } else {
      targetUrl = `${BASE_URL}/${path}`;
    }

    // Add query parameters dari request
    const url = new URL(targetUrl);
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') {
        url.searchParams.set(key, value);
      }
    });

    // Prepare headers
    const headers = getOptimizedHeaders(platform, token);
    
    // Log request untuk debugging (di development)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${method}] ${url.href}`);
    }

    // Make request dengan retry mechanism
    const response = await retryRequest(async () => {
      return await axios({
        method,
        url: url.href,
        headers,
        timeout: REQUEST_TIMEOUT,
        ...(requestBody && { data: requestBody }),
        validateStatus: () => true // Accept all status codes
      });
    });

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Add custom headers untuk response
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Proxy-Version', '3.0.0');
    res.setHeader('X-Platform', platform || 'unknown');

    // Return response with proper status code
    return res.status(response.status).json(response.data);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Proxy Error:', {
      message: error.message,
      path: req.query.path,
      method: req.method,
      responseTime: `${responseTime}ms`,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // Return appropriate error response
    const statusCode = error.response?.status || 500;
    const errorResponse = {
      error: true,
      message: error.message,
      path: req.query.path,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };

    // Add more details for 5xx errors
    if (statusCode >= 500) {
      errorResponse.details = 'Internal server error or upstream service unavailable';
      errorResponse.retryAfter = '30';
      res.setHeader('Retry-After', '30');
    }

    return res.status(statusCode).json(errorResponse);
  }
}
