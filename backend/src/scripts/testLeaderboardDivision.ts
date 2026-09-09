import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { getLeaderboard } from '../controllers/playerController';

async function test() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Testing Leaderboard Divisions...');

  const createMockRes = (name: string) => ({
    status: (code: number) => ({
      json: (data: any) => console.log(`[${name}] ERROR ${code}:`, data)
    }),
    json: (data: any) => {
      console.log(`[${name}] Division: ${data.data?.division}, TopBatsmen: ${data.data?.topBatsmen?.length}, TopBowlers: ${data.data?.topBowlers?.length}`);
      if (data.data?.topBatsmen?.[0]) {
        console.log(`  Top Batter: ${data.data.topBatsmen[0].playerName} (Runs: ${data.data.topBatsmen[0].batting.runs})`);
      }
    }
  } as any);

  await getLeaderboard({ query: { division: 'all' } } as any, createMockRes('ALL'));
  await getLeaderboard({ query: { division: 'international' } } as any, createMockRes('INTL'));
  await getLeaderboard({ query: { division: 'ipl' } } as any, createMockRes('IPL'));

  await mongoose.disconnect();
}
test().catch(console.error);
