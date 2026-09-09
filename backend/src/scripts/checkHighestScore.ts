import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { CareerStats } from '../models/CareerStats';
import { PlayerMatchStats } from '../models/PlayerMatchStats';

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('--- CAREER STATS ---');
  const all = await CareerStats.find({});
  for (const c of all) {
    console.log(`${c.playerName || 'Unknown'}: Total Runs=${c.batting?.runs}, HighestScore=${c.batting?.highestScore}, Matches=${c.batting?.matches}`);
  }

  console.log('--- PLAYER MATCH STATS ---');
  const matchStats = await PlayerMatchStats.find({});
  for (const m of matchStats) {
    console.log(`${m.playerName || 'Unknown'}: Match Runs=${m.batting?.runs}, Balls=${m.batting?.balls}, OutStatus=${m.batting?.outStatus}`);
  }

  await mongoose.disconnect();
}
check().catch(console.error);
