import api from './api';

export const uploadScorecard = async (uri: string): Promise<any> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'scorecard.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('scorecard', {
    uri,
    name: filename,
    type,
  } as any);

  const res = await api.post('/matches/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
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
