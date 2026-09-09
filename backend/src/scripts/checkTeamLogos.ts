import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { Team } from '../models/Team';

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const teams = await Team.find({});
  for (const t of teams.slice(0, 15)) {
    console.log(`${t.name} (${t.teamId}): Logo='${t.logoUrl || t.logo || ''}', Players=${t.players?.length}`);
  }
  await mongoose.disconnect();
}
check().catch(console.error);
