import api from './api';

export const getPlayers = async (search = '', page = 1, limit = 10): Promise<any> => {
  const query = search ? `&search=${encodeURIComponent(search)}` : '';
  const res = await api.get(`/players?page=${page}&limit=${limit}${query}`);
  return res.data;
};

export const getPlayerCareer = async (id: string): Promise<any> => {
  const res = await api.get(`/players/${id}/career`);
  return res.data;
};

export const getPlayerHistory = async (id: string): Promise<any> => {
  const res = await api.get(`/players/${id}/history`);
  return res.data;
};
