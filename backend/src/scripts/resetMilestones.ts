import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing');
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. In playermatchstats, remove fastestFiftyBalls and fastestHundredBalls for everyone EXCEPT Surya
  const nonSuryaFilter = {
    playerName: { $not: { $regex: 'yadav|surya', $options: 'i' } }
  };

  const updateNonSurya = await mongoose.connection.db!.collection('playermatchstats').updateMany(
    nonSuryaFilter,
    {
      $unset: {
        'batting.fastestFiftyBalls': '',
        'batting.fastestHundredBalls': ''
      }
    }
  );
  console.log('Cleared fastest 50/100 for non-Surya match stats:', updateNonSurya.modifiedCount);

  // For Surya, keep his 100 in 40 balls match
  const surya100Match = await mongoose.connection.db!.collection('playermatchstats').findOne({
    playerName: { $regex: 'yadav|surya', $options: 'i' },
    'batting.runs': { $gte: 100 }
  });

  if (surya100Match) {
    console.log('Found Surya 100 match:', surya100Match._id);
    await mongoose.connection.db!.collection('playermatchstats').updateOne(
      { _id: surya100Match._id },
      {
        $set: {
          'batting.fastestHundredBalls': 40
        },
        $unset: {
          'batting.fastestFiftyBalls': ''
        }
      }
    );
  }

  // Clear fastestFiftyBalls from other Surya matches
  await mongoose.connection.db!.collection('playermatchstats').updateMany(
    {
      playerName: { $regex: 'yadav|surya', $options: 'i' },
      'batting.runs': { $lt: 100 }
    },
    {
      $unset: {
        'batting.fastestFiftyBalls': '',
        'batting.fastestHundredBalls': ''
      }
    }
  );

  // 2. Clear CareerStats fastestFifty and fastestHundred for all players
  const updateCareers = await mongoose.connection.db!.collection('careerstats').updateMany(
    {
      playerName: { $not: { $regex: 'yadav|surya', $options: 'i' } }
    },
    {
      $set: {
        'batting.fastestFifty': null,
        'batting.fastestHundred': null
      }
    }
  );
  console.log('Cleared CareerStats fastest 50/100 for non-Surya players:', updateCareers.modifiedCount);

  // Set Surya's CareerStats fastestHundred to 40, fastestFifty to null
  await mongoose.connection.db!.collection('careerstats').updateOne(
    {
      playerName: { $regex: 'yadav|surya', $options: 'i' }
    },
    {
      $set: {
        'batting.fastestFifty': null,
        'batting.fastestHundred': 40
      }
    }
  );
  console.log('Updated Surya CareerStats: fastestHundred = 40, fastestFifty = null');

  // Verify all CareerStats
  const allCareers = await mongoose.connection.db!.collection('careerstats').find().toArray();
  console.log('\nFinal Career Stats:');
  allCareers.forEach((c: any) => {
    console.log(`${c.playerName} -> 50s: ${c.batting?.fifties}, Fastest 50: ${c.batting?.fastestFifty}, 100s: ${c.batting?.hundreds}, Fastest 100: ${c.batting?.fastestHundred}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
