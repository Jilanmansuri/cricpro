import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  console.log('Connecting to:', process.env.MONGO_URI ? 'URI present' : 'URI missing');
  await mongoose.connect(process.env.MONGO_URI || '', { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to DB');
  const venues = await mongoose.connection.collection('venues').find().toArray();
  console.log('Venues count:', venues.length);
  venues.forEach(v => console.log('-', v.name, '| city:', v.city, '| country:', v.country));
  await mongoose.disconnect();
}

run().catch(console.error);
