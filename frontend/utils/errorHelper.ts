export interface AppErrorInfo {
  title: string;
  message: string;
  status?: number;
  endpoint?: string;
  code?: string;
  technicalDetails?: string;
  suggestedFix?: string;
}

/**
 * Extracts and formats full, exact error details from API, Axios, Network, or JS errors.
 */
export const parseApiError = (err: any, fallbackTitle = 'Action Failed'): AppErrorInfo => {
  if (!err) {
    return {
      title: fallbackTitle,
      message: 'An unexpected error occurred.',
    };
  }

  // 1. Server Response Error (HTTP 4xx, 5xx)
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;

    let serverMessage = '';
    if (typeof data === 'string') {
      serverMessage = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        // e.g. express-validator errors: [{ msg: '...' }]
        serverMessage = data.errors.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
      } else {
        serverMessage = data.message || data.error || data.msg || '';
      }
    }

    const endpoint = err.config?.url ? `${err.config.baseURL || ''}${err.config.url}` : undefined;

    let statusText = 'Error';
    let suggestedFix = '';

    switch (status) {
      case 400:
        statusText = 'Bad Request (400)';
        suggestedFix = serverMessage.toLowerCase().includes('scorecard')
          ? 'Kripya ek valid scorecard image select karein. Web me image format check karein.'
          : 'Request me kuch required fields missing ya invalid hain.';
        break;
      case 401:
        statusText = 'Unauthorized (401)';
        suggestedFix = 'Aapka login session expire ho gaya hai. Kripya dobara login karein.';
        break;
      case 403:
        statusText = 'Forbidden (403)';
        suggestedFix = 'Aapke pass is action ko perform karne ki permission nahi hai.';
        break;
      case 404:
        statusText = 'Not Found (404)';
        suggestedFix = 'Requested resource ya API endpoint server par nahi mila.';
        break;
      case 429:
        statusText = 'Too Many Requests (429)';
        suggestedFix = 'Bohot saari requests ek sath bhej di gayi hain. Thoda intezar karke try karein.';
        break;
      case 500:
        statusText = 'Internal Server Error (500)';
        suggestedFix = 'Backend server par internal error hua hai. Backend console logs check karein.';
        break;
      case 502:
      case 503:
      case 504:
        statusText = `Gateway/Service Unavailable (${status})`;
        suggestedFix = 'Backend server unreachable hai ya restart ho raha hai.';
        break;
      default:
        statusText = `Server Status ${status}`;
    }

    return {
      title: `${fallbackTitle} [${statusText}]`,
      message: serverMessage || err.message || `Server responded with status code ${status}.`,
      status,
      endpoint,
      code: err.code,
      technicalDetails: `Status: ${status} | Method: ${(err.config?.method || 'GET').toUpperCase()} | Endpoint: ${endpoint || 'Unknown'}`,
      suggestedFix,
    };
  }

  // 2. Network / Connection Refused Error
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || err.message?.includes('NetworkError')) {
    const targetUrl = err.config?.url ? `${err.config.baseURL || ''}${err.config.url}` : 'http://localhost:5000';
    const isCloud = targetUrl.includes('onrender.com');

    return {
      title: isCloud ? '☁️ Cloud Server Waking Up' : '🔌 Network Error (Connection Refused)',
      message: isCloud
        ? 'Cloud backend sleep mode se wake up ho raha hai. Thoda sa waqt lag sakta hai.'
        : 'Backend server se connection nahi ho saka. Server unreachable hai.',
      endpoint: targetUrl,
      code: 'ERR_NETWORK',
      technicalDetails: `Cannot connect to: ${targetUrl}`,
      suggestedFix: isCloud
        ? 'Render cloud free tier 15 min inactive rehne par sleep ho jata hai. Ek baar refresh ya 5-10 second baad dobara koshish karein, server turant chal padega.'
        : 'Check karein ki Backend server (Node/Express) port 5000 par running hai ya nahi.',
    };
  }

  // 3. Timeout Error
  if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
    const targetUrl = err.config?.url ? `${err.config.baseURL || ''}${err.config.url}` : '';
    const isCloud = targetUrl.includes('onrender.com');

    return {
      title: isCloud ? '⏳ Server Starting Up' : '⏱️ Request Timeout',
      message: isCloud
        ? 'Cloud server start hone me thoda samay le raha hai. Kripya dubara koshish karein.'
        : 'Server ne response dene me bohot zyada samay liya (Request timed out).',
      code: 'ECONNABORTED',
      technicalDetails: err.message,
      suggestedFix: isCloud
        ? 'Server wake ho chuka hai, ab dubara tap karein to turant response aayega.'
        : 'Apna internet connection check karein ya thoda ruk kar dubara koshish karein.',
    };
  }

  // 4. Standard JavaScript / Native Error
  return {
    title: fallbackTitle,
    message: err.message || String(err),
    code: err.name || 'Error',
    technicalDetails: err.stack ? err.stack.split('\n').slice(0, 2).join(' ') : undefined,
  };
};
