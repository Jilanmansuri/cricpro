import api from './api';

export const createTeam = async (name: string, logo?: string): Promise<any> => {
  const res = await api.post('/teams', { name, logo });
  return res.data;
};

export const getTeams = async (search = '', page = 1, limit = 10): Promise<any> => {
  const query = search ? `&search=${encodeURIComponent(search)}` : '';
  const res = await api.get(`/teams?page=${page}&limit=${limit}${query}`);
  return res.data;
};

export const getTeamById = async (id: string): Promise<any> => {
  const res = await api.get(`/teams/${id}`);
  return res.data;
};
