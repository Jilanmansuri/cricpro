import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

interface PlayerDef {
  name: string;
  fullName: string;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper';
  battingStyle: string;
  bowlingStyle: string;
}

const CURRENT_INDIAN_PLAYERS: PlayerDef[] = [
  { name: 'R Sharma', fullName: 'Rohit Sharma', role: 'batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak' },
  { name: 'V Kohli', fullName: 'Virat Kohli', role: 'batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
  { name: 'Y Jaiswal', fullName: 'Yashasvi Jaiswal', role: 'batsman', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm legbreak' },
  { name: 'R Pant', fullName: 'Rishabh Pant', role: 'wicketkeeper', battingStyle: 'Left-hand bat', bowlingStyle: 'None' },
  { name: 'KL Rahul', fullName: 'KL Rahul', role: 'wicketkeeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
  { name: 'S Iyer', fullName: 'Shreyas Iyer', role: 'batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak' },
  { name: 'R Singh', fullName: 'Rinku Singh', role: 'batsman', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak' },
  { name: 'T Varma', fullName: 'Tilak Varma', role: 'batsman', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak' },
  { name: 'W Sundar', fullName: 'Washington Sundar', role: 'all-rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak' },
  { name: 'R Bishnoi', fullName: 'Ravi Bishnoi', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak' },
  { name: 'M Shami', fullName: 'Mohammed Shami', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
  { name: 'Y Chahal', fullName: 'Yuzvendra Chahal', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak' },
  { name: 'V Chakaravarthy', fullName: 'Varun Chakaravarthy', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak' },
  { name: 'N Reddy', fullName: 'Nitish Kumar Reddy', role: 'all-rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast' },
  { name: 'H Rana', fullName: 'Harshit Rana', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium' },
  { name: 'M Yadav', fullName: 'Mayank Yadav', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
  { name: 'D Jurel', fullName: 'Dhruv Jurel', role: 'wicketkeeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
  { name: 'J Sharma', fullName: 'Jitesh Sharma', role: 'wicketkeeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
  { name: 'A Khan', fullName: 'Avesh Khan', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium' },
  { name: 'P Krishna', fullName: 'Prasidh Krishna', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
  { name: 'K Ahmed', fullName: 'Khaleel Ahmed', role: 'bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium' },
  { name: 'I Kishan', fullName: 'Ishan Kishan', role: 'wicketkeeper', battingStyle: 'Left-hand bat', bowlingStyle: 'None' },
  { name: 'S Thakur', fullName: 'Shardul Thakur', role: 'all-rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast' },
  { name: 'R Jadeja', fullName: 'Ravindra Jadeja', role: 'all-rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('Connected to MongoDB');

  const userId = new mongoose.Types.ObjectId('6a9ff9e7107a8fe0cb7b311b');

  const indiaTeam = await mongoose.connection.db!.collection('teams').findOne({ name: 'India' });
  const teamId = indiaTeam ? indiaTeam._id : undefined;

  let addedCount = 0;
  for (const p of CURRENT_INDIAN_PLAYERS) {
    const existing = await mongoose.connection.db!.collection('players').findOne({
      $or: [
        { name: { $regex: `^${p.name}$`, $options: 'i' } },
        { name: { $regex: `^${p.fullName}$`, $options: 'i' } }
      ]
    });

    let playerId: mongoose.Types.ObjectId;
    if (!existing) {
      const doc = {
        name: p.name,
        role: p.role,
        battingStyle: p.battingStyle,
        bowlingStyle: p.bowlingStyle,
        country: 'India',
        nationalTeamId: 'INT_IND',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const res = await mongoose.connection.db!.collection('players').insertOne(doc);
      playerId = res.insertedId;
      addedCount++;
      console.log(`+ Added player: ${p.fullName} (${p.name})`);
    } else {
      playerId = existing._id;
      console.log(`= Existing player: ${p.fullName} (${p.name})`);
    }

    // Ensure CareerStats exists for the player
    const existingCareer = await mongoose.connection.db!.collection('careerstats').findOne({ playerId });
    if (!existingCareer) {
      await mongoose.connection.db!.collection('careerstats').insertOne({
        playerId,
        playerName: p.name,
        batting: {
          matches: 0,
          innings: 0,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          fifties: 0,
          hundreds: 0,
          fastestFifty: null,
          fastestHundred: null,
          ducks: 0,
          highestScore: 0,
          notOuts: 0,
        },
        bowling: {
          innings: 0,
          overs: 0,
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          bestBowling: { wickets: 0, runs: 0 },
        },
        fielding: {
          catches: 0,
          stumpings: 0,
          runOuts: 0,
        },
        wins: 0,
        losses: 0,
        mvps: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`  Initialized CareerStats for: ${p.name}`);
    }
  }

  // Clean India team players list and link all current players
  if (teamId) {
    const allDbIndianPlayers = await mongoose.connection.db!.collection('players').find({ country: 'India' }).toArray();
    const playerIds = allDbIndianPlayers.map(p => p._id);
    await mongoose.connection.db!.collection('teams').updateOne(
      { _id: teamId },
      { $set: { players: playerIds } }
    );
    console.log(`Updated India team squad with ${playerIds.length} players!`);
  }

  const totalPlayers = await mongoose.connection.db!.collection('players').countDocuments();
  console.log(`\nSuccess! Total players in DB now: ${totalPlayers} (Added ${addedCount} new current players)`);

  await mongoose.disconnect();
}

run().catch(console.error);
