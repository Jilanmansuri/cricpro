import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { Team } from '../models/Team';
import { Match } from '../models/Match';

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const teams = await Team.find({});
  console.log('Total teams:', teams.length);
  for (const t of teams.slice(0, 15)) {
    console.log(`Team: ${t.name}, Type: ${t.teamType}, League: ${t.league}, TeamId: ${t.teamId}`);
  }
  const matches = await Match.find({}).populate('teamA teamB');
  console.log('Total matches:', matches.length);
  for (const m of matches) {
    console.log(`Match: ${(m.teamA as any)?.name || 'N/A'} vs ${(m.teamB as any)?.name || 'N/A'}, TypeA: ${(m.teamA as any)?.teamType}, LeagueA: ${(m.teamA as any)?.league}`);
  }
  await mongoose.disconnect();
}
check().catch(console.error);
