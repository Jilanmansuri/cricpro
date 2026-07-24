import api from './api';

export const createTournament = async (name: string, startDate: string, endDate: string): Promise<any> => {
  const res = await api.post('/tournaments', { name, startDate, endDate });
  return res.data;
};

export const getTournaments = async (): Promise<any> => {
  const res = await api.get('/tournaments');
  return res.data;
};

export const getTournamentStandings = async (id: string): Promise<any> => {
  const res = await api.get(`/tournaments/${id}/standings`);
  return res.data;
};

export const getTournamentLeaders = async (id: string): Promise<any> => {
  const res = await api.get(`/tournaments/${id}/leaders`);
  return res.data;
};
