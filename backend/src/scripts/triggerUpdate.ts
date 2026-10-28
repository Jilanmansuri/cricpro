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
import { Player } from '../models/Player';
import { Team } from '../models/Team';
import { StatsService } from '../services/StatsService';
import { cacheManager } from '../utils/cacheManager';

async function main() {
  console.log('🔄 [Update] Starting full stats recalculation and cache flush...');
  await connectDB();

  const statsService = new StatsService();

  // 1. Recalculate all players
  const players = await Player.find({});
  console.log(`Found ${players.length} players. Recalculating career stats...`);
  let updatedPlayers = 0;
  for (const player of players) {
    try {
      await statsService.recalculatePlayerCareer(player._id as any);
      updatedPlayers++;
    } catch (err: any) {
      console.error(`Failed to recalculate player ${player.name}:`, err.message);
    }
  }
  console.log(`✓ Recalculated career stats for ${updatedPlayers} players.`);

  // 2. Recalculate all teams
  const teams = await Team.find({});
  console.log(`Found ${teams.length} teams. Recalculating team stats...`);
  let updatedTeams = 0;
  for (const team of teams) {
    try {
      await statsService.recalculateTeamStats(team._id as any);
      updatedTeams++;
    } catch (err: any) {
      console.error(`Failed to recalculate team ${team.name}:`, err.message);
    }
  }
  console.log(`✓ Recalculated stats for ${updatedTeams} teams.`);

  // 3. Clear cache
  cacheManager.clear();
  console.log('✓ In-memory API cache cleared.');

  console.log('✅ [Update] Full system stats updated successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
