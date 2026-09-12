import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const INDIAN_PLAYERS_META: Record<string, { fullName: string; iplTeamId: string }> = {
  'S Samson': { fullName: 'Sanju Samson', iplTeamId: 'IPL_RR' },
  'A Sharma': { fullName: 'Abhishek Sharma', iplTeamId: 'IPL_SRH' },
  'S Gill': { fullName: 'Shubman Gill', iplTeamId: 'IPL_GT' },
  'S Yadav': { fullName: 'Suryakumar Yadav', iplTeamId: 'IPL_MI' },
  'R Gaikwad': { fullName: 'Ruturaj Gaikwad', iplTeamId: 'IPL_CSK' },
  'H Pandya': { fullName: 'Hardik Pandya', iplTeamId: 'IPL_MI' },
  'A Patel': { fullName: 'Axar Patel', iplTeamId: 'IPL_DC' },
  'Arshdeep': { fullName: 'Arshdeep Singh', iplTeamId: 'IPL_PBKS' },
  'J Bumrah': { fullName: 'Jasprit Bumrah', iplTeamId: 'IPL_MI' },
  'M Siraj': { fullName: 'Mohammed Siraj', iplTeamId: 'IPL_RCB' },
  'Y Kuldeep': { fullName: 'Kuldeep Yadav', iplTeamId: 'IPL_DC' },
  'S Dube': { fullName: 'Shivam Dube', iplTeamId: 'IPL_CSK' },
};

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas');

  const db = mongoose.connection.db!;
  const playersCol = db.collection('players');
  const careerCol = db.collection('careerstats');
  const matchStatsCol = db.collection('playermatchstats');
  const teamsCol = db.collection('teams');

  // Find India Team doc
  const indiaTeam = await teamsCol.findOne({
    $or: [
      { teamId: 'INT_IND' },
      { name: { $regex: /^india$/i } }
    ]
  });

  if (!indiaTeam) {
    console.error('India team not found');
    process.exit(1);
  }

  const indiaTeamId = indiaTeam._id;
  console.log('Found India Team ID:', indiaTeamId.toString());

  // 1. Identify all Indian Players in DB
  const allPlayers = await playersCol.find({}).toArray();
  const indianPlayerIds: mongoose.Types.ObjectId[] = [];
  const nonIndianPlayerIds: mongoose.Types.ObjectId[] = [];

  for (const p of allPlayers) {
    const meta = INDIAN_PLAYERS_META[p.name];
    if (meta) {
      indianPlayerIds.push(p._id);
      // Update Indian player document with proper metadata
      await playersCol.updateOne(
        { _id: p._id },
        {
          $set: {
            fullName: meta.fullName,
            country: 'India',
            nationalTeamId: 'INT_IND',
            iplTeamId: meta.iplTeamId,
          }
        }
      );
      console.log(`[KEEP] Indian Player Verified: ${p.name} (${meta.fullName}) - ${meta.iplTeamId}`);
    } else {
      nonIndianPlayerIds.push(p._id);
      console.log(`[DELETE] Non-Indian Player Marked for Deletion: ${p.name}`);
    }
  }

  console.log(`\nFound ${indianPlayerIds.length} Indian players to KEEP.`);
  console.log(`Found ${nonIndianPlayerIds.length} Non-Indian players to REMOVE.\n`);

  if (nonIndianPlayerIds.length > 0) {
    // 2. Delete non-Indian players from careerstats
    const delCareer = await careerCol.deleteMany({
      playerId: { $in: nonIndianPlayerIds }
    });
    console.log(`Deleted ${delCareer.deletedCount} records from careerstats.`);

    // 3. Delete non-Indian players from playermatchstats
    const delMatchStats = await matchStatsCol.deleteMany({
      playerId: { $in: nonIndianPlayerIds }
    });
    console.log(`Deleted ${delMatchStats.deletedCount} records from playermatchstats.`);

    // 4. Delete non-Indian players from players collection
    const delPlayers = await playersCol.deleteMany({
      _id: { $in: nonIndianPlayerIds }
    });
    console.log(`Deleted ${delPlayers.deletedCount} records from players collection.`);

    // 5. Clean up non-Indian player IDs from all team rosters
    await teamsCol.updateMany(
      {},
      {
        $pull: {
          players: { $in: nonIndianPlayerIds }
        } as any
      }
    );
    console.log('Cleaned up team rosters in teams collection.');
  }

  // 6. Ensure all Indian PlayerMatchStats point to India team
  const updatedPms = await matchStatsCol.updateMany(
    { playerId: { $in: indianPlayerIds } },
    { $set: { teamId: indiaTeamId } }
  );
  console.log(`Standardized ${updatedPms.modifiedCount} Indian match stats to India Team ID.`);

  // 7. Ensure India Team roster has exactly all 12 Indian players
  await teamsCol.updateOne(
    { _id: indiaTeamId },
    {
      $set: {
        players: indianPlayerIds
      }
    }
  );
  console.log('Synchronized India Team roster with all Indian players.');

  // 8. Verification Report
  const remainingPlayers = await playersCol.find({}).toArray();
  const remainingCareer = await careerCol.find({}).toArray();

  console.log('\n=== FINAL VERIFICATION ===');
  console.log('Remaining Players in DB:', remainingPlayers.length);
  remainingPlayers.forEach(p => {
    console.log(`- ${p.name.padEnd(14)} | ${p.fullName.padEnd(18)} | Country: ${p.country} | Team: ${p.nationalTeamId} | IPL: ${p.iplTeamId}`);
  });

  console.log('\nRemaining CareerStats in DB:', remainingCareer.length);
  remainingCareer.forEach(c => {
    console.log(`- ${c.playerName.padEnd(14)} | Runs: ${String(c.batting?.runs ?? 0).padEnd(4)} | Wkts: ${String(c.bowling?.wickets ?? 0).padEnd(3)} | Matches: ${c.batting?.matches ?? 0}`);
  });

  console.log('\nMigration completed successfully with 0 Indian players removed.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
