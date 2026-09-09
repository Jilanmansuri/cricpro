import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { CareerStats } from '../models/CareerStats';
import { PlayerMatchStats } from '../models/PlayerMatchStats';
import { Player } from '../models/Player';

async function backfillPlayerNames() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  // 1. Backfill CareerStats
  const careerStatsList = await CareerStats.find({});
  console.log(`Found ${careerStatsList.length} CareerStats records.`);
  let updatedCareer = 0;

  for (const cs of careerStatsList) {
    if (cs.playerId) {
      const player = await Player.findById(cs.playerId);
      if (player && player.name) {
        cs.playerName = player.name;
        await cs.save();
        updatedCareer++;
      }
    }
  }
  console.log(`Updated ${updatedCareer} CareerStats records with playerName.`);

  // 2. Backfill PlayerMatchStats
  const matchStatsList = await PlayerMatchStats.find({});
  console.log(`Found ${matchStatsList.length} PlayerMatchStats records.`);
  let updatedMatchStats = 0;

  for (const ms of matchStatsList) {
    if (ms.playerId) {
      const player = await Player.findById(ms.playerId);
      if (player && player.name) {
        ms.playerName = player.name;
        await ms.save();
        updatedMatchStats++;
      }
    }
  }
  console.log(`Updated ${updatedMatchStats} PlayerMatchStats records with playerName.`);

  console.log('Backfill completed successfully!');
  await mongoose.disconnect();
}

backfillPlayerNames().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
