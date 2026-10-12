import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  const teams = await mongoose.connection.db!.collection('teams').find({}).toArray();
  for (const t of teams) {
    console.log(`Team: ${t.name} (ID: ${t._id}, Code: ${t.code}) - Players count: ${t.players?.length || 0}`);
  }
  const players = await mongoose.connection.db!.collection('players').find({}).toArray();
  console.log('\nAll Players:');
  for (const p of players) {
    const career = await mongoose.connection.db!.collection('careerstats').findOne({ playerId: p._id });
    console.log(`- ${p.name} (Matches: ${career?.batting?.matches || 0})`);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
