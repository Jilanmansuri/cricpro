import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import '../models/Venue';
import '../models/Team';
import '../models/Player';
import '../models/Tournament';
import '../models/CareerStats';
import '../models/PlayerMatchStats';
import { AutoUpdateService } from '../services/AutoUpdateService';

async function main() {
  await connectDB();
  const autoUpdateService = AutoUpdateService.getInstance();
  const result = await autoUpdateService.performFullStatsUpdate();
  console.log(`Summary: ${result.playersCount} players and ${result.teamsCount} teams updated in ${result.durationMs}ms.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Update script failed:', err);
  process.exit(1);
});
