import api from './api';

export const uploadScorecard = async (
  uris: string | string[],
  onStatusUpdate?: (status: string) => void
): Promise<any> => {
  const uriList = Array.isArray(uris) ? uris : [uris];
  const formData = new FormData();

  uriList.forEach((uri, idx) => {
    const filename = uri.split('/').pop() || `scorecard_${idx}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('scorecard', {
      uri,
      name: filename,
      type,
    } as any);
  });

  const maxAttempts = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        onStatusUpdate?.(`Server wake-up in progress, retrying (${attempt}/${maxAttempts})...`);
      }

      const res = await api.post('/matches/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes to allow Render cold start + Gemini Vision AI processing
      });
      return res.data;
    } catch (err: any) {
      lastError = err;
      const isNetworkOrTimeout =
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        err.message === 'Network Error' ||
        err.message?.toLowerCase().includes('timeout');

      // If it's a cold start / network issue and we have remaining attempts, wait and retry
      if (isNetworkOrTimeout && attempt < maxAttempts) {
        console.warn(`[uploadScorecard] Attempt ${attempt} failed. Retrying in 4 seconds...`, err.message);
        onStatusUpdate?.(`Cloud server wake ho raha hai... (Attempt ${attempt}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

export const checkDuplicateMatch = async (payload: {
  date: string;
  teamAName: string;
  teamBName: string;
}): Promise<any> => {
  const res = await api.post('/matches/check-duplicate', payload);
  return res.data;
};

export const saveMatch = async (payload: any): Promise<any> => {
  const res = await api.post('/matches/save', payload);
  return res.data;
};

export const getMatches = async (page = 1, limit = 10): Promise<any> => {
  const res = await api.get(`/matches?page=${page}&limit=${limit}`);
  return res.data;
};

export const getMatchById = async (id: string): Promise<any> => {
  const res = await api.get(`/matches/${id}`);
  return res.data;
};

export const exportScorecard = async (id: string, format: 'csv' | 'html' = 'csv'): Promise<string> => {
  const res = await api.get(`/matches/${id}/export?format=${format}`);
  return res.data;
};
