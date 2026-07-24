import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CareerStats } from './src/models/CareerStats';
import { Player } from './src/models/Player'; // Need to import Player so the schema is registered!

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Players registered:', mongoose.models.Player !== undefined);
  const res = await CareerStats.find().populate('playerId').exec();
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
test();
