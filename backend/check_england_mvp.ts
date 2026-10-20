import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Match from './src/models/Match.js';
import PlayerMatchStats from './src/models/PlayerMatchStats.js';
import Player from './src/models/Player.js';

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to DB');

  const matches = await Match.find({
    $or: [
      { 'team1.name': /england/i },
      { 'team2.name': /england/i },
      { 'team1.shortName': /eng/i },
      { 'team2.shortName': /eng/i },
      { opponent: /england/i }
    ]
  }).populate('potm mvp playerOfTheMatch');

  console.log('Found England matches:', matches.length);
  for (const m of matches) {
    console.log('Match ID:', m._id);
    console.log('Teams:', m.team1?.name, 'vs', m.team2?.name);
    console.log('Date:', m.date);
    console.log('MVP / POTM field:', m.mvp, m.potm, m.playerOfTheMatch);
    if (m.mvp) {
      const p = await Player.findById(m.mvp);
      console.log('MVP Player name:', p?.name);
    }
    if (m.potm) {
      const p = await Player.findById(m.potm);
      console.log('POTM Player name:', p?.name);
    }
    const matchStats = await PlayerMatchStats.find({ matchId: m._id }).populate('playerId');
    console.log('PlayerMatchStats count for this match:', matchStats.length);
    for (const s of matchStats) {
      console.log(` - ${(s.playerId as any)?.name}: runs=${s.batting?.runs}(${s.batting?.balls}b), wkts=${s.bowling?.wickets}`);
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);
