import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { User } from '../models/User';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { Player } from '../models/Player';
import { Tournament } from '../models/Tournament';
import { Venue } from '../models/Venue';

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cricpro');
  console.log('Connected to MongoDB.');

  const targetEmail = 'jilan2410@gmail.com';
  const user = await User.findOne({
    $or: [{ email: targetEmail }, { username: 'jilan2410' }]
  });

  if (!user) {
    console.error('Target user not found:', targetEmail);
    process.exit(1);
  }

  const userId = user._id;
  console.log(`Found target user: ${user.username} (${user.email}) - ID: ${userId}`);

  // Drop old unique indexes that might prevent multi-user duplicate names
  try {
    const teamIndexes = await Team.collection.indexes();
    for (const idx of teamIndexes) {
      if (idx.name === 'name_1' || idx.name === 'teamId_1') {
        console.log(`Dropping index on Team: ${idx.name}`);
        await Team.collection.dropIndex(idx.name);
      }
    }
  } catch (err: any) {
    console.log('Note on team index drop:', err.message);
  }

  try {
    const venueIndexes = await Venue.collection.indexes();
    for (const idx of venueIndexes) {
      if (idx.name === 'name_1') {
        console.log(`Dropping index on Venue: ${idx.name}`);
        await Venue.collection.dropIndex(idx.name);
      }
    }
  } catch (err: any) {
    console.log('Note on venue index drop:', err.message);
  }

  // 1. Assign Matches
  const matchResult = await Match.updateMany(
    { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
    { $set: { createdBy: userId } }
  );
  console.log(`Updated Matches: ${matchResult.modifiedCount} assigned to ${user.username}`);

  // 2. Assign Teams
  const teamResult = await Team.updateMany(
    { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
    { $set: { createdBy: userId } }
  );
  console.log(`Updated Teams: ${teamResult.modifiedCount} assigned to ${user.username}`);

  // 3. Assign Players
  const playerResult = await Player.updateMany(
    { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
    { $set: { createdBy: userId } }
  );
  console.log(`Updated Players: ${playerResult.modifiedCount} assigned to ${user.username}`);

  // 4. Assign Tournaments
  const tournamentResult = await Tournament.updateMany(
    { $or: [{ organizer: { $exists: false } }, { organizer: null }, { createdBy: { $exists: false } }] },
    { $set: { organizer: userId, createdBy: userId } }
  );
  console.log(`Updated Tournaments: ${tournamentResult.modifiedCount} assigned to ${user.username}`);

  // 5. Assign Venues
  const venueResult = await Venue.updateMany(
    { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
    { $set: { createdBy: userId } }
  );
  console.log(`Updated Venues: ${venueResult.modifiedCount} assigned to ${user.username}`);

  console.log('\nMigration complete! All existing data transferred to jilan2410.');
  await mongoose.disconnect();
}

migrate().catch(console.error);
