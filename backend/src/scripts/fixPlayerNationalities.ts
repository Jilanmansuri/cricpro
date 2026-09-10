import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { Player } from '../models/Player';
import { Team } from '../models/Team';
import { PlayerMatchStats } from '../models/PlayerMatchStats';
import { StatsService } from '../services/StatsService';
import { geminiPlayerService } from '../services/GeminiPlayerService';

async function fixNationalities() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cricpro');

  const allPlayers = await Player.find({});
  console.log(`Found ${allPlayers.length} players in DB.`);

  const playerNames = allPlayers.map(p => p.name);
  console.log('Resolving player nationalities with Gemini AI...');
  const resolvedMap = await geminiPlayerService.resolvePlayers(playerNames);

  // Teams lookup
  const allTeams = await Team.find({});
  const teamByCode = new Map(allTeams.map(t => [t.teamId, t]));
  const indiaTeam = teamByCode.get('INT_IND');
  const ausTeam = teamByCode.get('INT_AUS');

  if (!indiaTeam || !ausTeam) {
    console.error('Missing India or Australia team in DB!');
    return;
  }

  console.log(`India Team ID: ${indiaTeam._id}, Australia Team ID: ${ausTeam._id}`);

  // 1. Update Player documents
  for (const p of allPlayers) {
    const info = resolvedMap.get(p.name.toLowerCase().trim());
    if (info) {
      p.country = info.country;
      p.nationalTeamId = info.nationalTeamId;
      p.fullName = info.fullName;
      if (info.iplTeamId) p.iplTeamId = info.iplTeamId;
      await p.save();
      console.log(`Updated player: ${p.name} -> Country: ${p.country}, NatTeam: ${p.nationalTeamId}, IPL: ${p.iplTeamId}`);

      // If player belongs to India, ensure they are in India's roster
      if (info.nationalTeamId === 'INT_IND') {
        if (!indiaTeam.players.some(id => id.toString() === p._id.toString())) {
          indiaTeam.players.push(p._id);
        }
      }
    }
  }

  // 2. Remove Indian players from Australia's roster
  const indianPlayerIds = new Set(
    allPlayers
      .filter(p => p.nationalTeamId === 'INT_IND' || p.country?.toLowerCase() === 'india')
      .map(p => p._id.toString())
  );

  const initialAusCount = ausTeam.players.length;
  ausTeam.players = ausTeam.players.filter((pId: any) => !indianPlayerIds.has(pId.toString())) as any;
  console.log(`Australia roster before: ${initialAusCount}, after removing Indian players: ${ausTeam.players.length}`);

  await indiaTeam.save();
  await ausTeam.save();

  // 3. Fix PlayerMatchStats where Indian players were erroneously assigned to Australia
  const fixPmsResult = await PlayerMatchStats.updateMany(
    {
      playerId: { $in: Array.from(indianPlayerIds).map(id => new mongoose.Types.ObjectId(id)) },
      teamId: ausTeam._id
    },
    {
      $set: { teamId: indiaTeam._id }
    }
  );
  console.log(`Updated PlayerMatchStats records: ${fixPmsResult.modifiedCount} moved from Australia to India.`);

  // 4. Recalculate Career stats for all players
  console.log('Recalculating Career Stats...');
  const statsService = new StatsService();
  for (const p of allPlayers) {
    await statsService.recalculatePlayerCareer(p._id as any);
  }

  console.log('Fix completed successfully!');
  await mongoose.disconnect();
}

fixNationalities().catch(console.error);
