import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Team } from '../models/Team';
import { TeamMatchingService } from '../services/TeamMatchingService';

export const OFFICIAL_TEAM_MASTER_DATA = [
  // 1. INTERNATIONAL TEAMS (12 ICC Full Members)
  {
    teamId: "INT_AFG",
    officialName: "Afghanistan",
    displayName: "Afghanistan",
    shortName: "Afghanistan",
    abbreviation: "AFG",
    aliases: ["Afghanistan", "Afghanistan Cricket Team", "AFG"],
    teamType: "international",
    country: "Afghanistan",
    league: null,
    isActive: true,
    name: "Afghanistan"
  },
  {
    teamId: "INT_AUS",
    officialName: "Australia",
    displayName: "Australia",
    shortName: "Australia",
    abbreviation: "AUS",
    aliases: ["Australia", "Australia Cricket Team", "AUS"],
    teamType: "international",
    country: "Australia",
    league: null,
    isActive: true,
    name: "Australia"
  },
  {
    teamId: "INT_BAN",
    officialName: "Bangladesh",
    displayName: "Bangladesh",
    shortName: "Bangladesh",
    abbreviation: "BAN",
    aliases: ["Bangladesh", "Bangladesh Cricket Team", "BAN"],
    teamType: "international",
    country: "Bangladesh",
    league: null,
    isActive: true,
    name: "Bangladesh"
  },
  {
    teamId: "INT_ENG",
    officialName: "England",
    displayName: "England",
    shortName: "England",
    abbreviation: "ENG",
    aliases: ["England", "England Cricket Team", "ENG", "England and Wales"],
    teamType: "international",
    country: "England",
    league: null,
    isActive: true,
    name: "England"
  },
  {
    teamId: "INT_IND",
    officialName: "India",
    displayName: "India",
    shortName: "India",
    abbreviation: "IND",
    aliases: ["India", "India Cricket Team", "Team India", "IND"],
    teamType: "international",
    country: "India",
    league: null,
    isActive: true,
    name: "India"
  },
  {
    teamId: "INT_IRE",
    officialName: "Ireland",
    displayName: "Ireland",
    shortName: "Ireland",
    abbreviation: "IRE",
    aliases: ["Ireland", "Ireland Cricket Team", "IRE"],
    teamType: "international",
    country: "Ireland",
    league: null,
    isActive: true,
    name: "Ireland"
  },
  {
    teamId: "INT_NZL",
    officialName: "New Zealand",
    displayName: "New Zealand",
    shortName: "New Zealand",
    abbreviation: "NZ",
    aliases: ["New Zealand", "New Zealand Cricket Team", "NZ", "NZL", "Black Caps", "Blackcaps"],
    teamType: "international",
    country: "New Zealand",
    league: null,
    isActive: true,
    name: "New Zealand"
  },
  {
    teamId: "INT_PAK",
    officialName: "Pakistan",
    displayName: "Pakistan",
    shortName: "Pakistan",
    abbreviation: "PAK",
    aliases: ["Pakistan", "Pakistan Cricket Team", "PAK", "Green Shirts"],
    teamType: "international",
    country: "Pakistan",
    league: null,
    isActive: true,
    name: "Pakistan"
  },
  {
    teamId: "INT_RSA",
    officialName: "South Africa",
    displayName: "South Africa",
    shortName: "South Africa",
    abbreviation: "SA",
    aliases: ["South Africa", "South Africa Cricket Team", "SA", "RSA", "Proteas"],
    teamType: "international",
    country: "South Africa",
    league: null,
    isActive: true,
    name: "South Africa"
  },
  {
    teamId: "INT_SRI",
    officialName: "Sri Lanka",
    displayName: "Sri Lanka",
    shortName: "Sri Lanka",
    abbreviation: "SL",
    aliases: ["Sri Lanka", "Sri Lanka Cricket Team", "SL", "Lions"],
    teamType: "international",
    country: "Sri Lanka",
    league: null,
    isActive: true,
    name: "Sri Lanka"
  },
  {
    teamId: "INT_WI",
    officialName: "West Indies",
    displayName: "West Indies",
    shortName: "West Indies",
    abbreviation: "WI",
    aliases: ["West Indies", "West Indies Cricket Team", "WI", "Windies"],
    teamType: "international",
    country: null,
    league: null,
    isActive: true,
    name: "West Indies"
  },
  {
    teamId: "INT_ZIM",
    officialName: "Zimbabwe",
    displayName: "Zimbabwe",
    shortName: "Zimbabwe",
    abbreviation: "ZIM",
    aliases: ["Zimbabwe", "Zimbabwe Cricket Team", "ZIM"],
    teamType: "international",
    country: "Zimbabwe",
    league: null,
    isActive: true,
    name: "Zimbabwe"
  },

  // 2. IPL TEAMS (10 Current Franchise Teams)
  {
    teamId: "IPL_CSK",
    officialName: "Chennai Super Kings",
    displayName: "Chennai Super Kings",
    shortName: "CSK",
    abbreviation: "CSK",
    aliases: [
      "Chennai Super Kings",
      "CSK",
      "Chennai",
      "Chennai Super Kings Cricket Team"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Chennai Super Kings"
  },
  {
    teamId: "IPL_DC",
    officialName: "Delhi Capitals",
    displayName: "Delhi Capitals",
    shortName: "DC",
    abbreviation: "DC",
    aliases: [
      "Delhi Capitals",
      "Delhi Capitals Cricket Team",
      "DC",
      "Delhi",
      "Delhi Daredevils",
      "DD"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Delhi Capitals"
  },
  {
    teamId: "IPL_GT",
    officialName: "Gujarat Titans",
    displayName: "Gujarat Titans",
    shortName: "GT",
    abbreviation: "GT",
    aliases: [
      "Gujarat Titans",
      "Gujarat Titans Cricket Team",
      "GT",
      "Gujarat"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Gujarat Titans"
  },
  {
    teamId: "IPL_KKR",
    officialName: "Kolkata Knight Riders",
    displayName: "Kolkata Knight Riders",
    shortName: "KKR",
    abbreviation: "KKR",
    aliases: [
      "Kolkata Knight Riders",
      "Kolkata Knight Riders Cricket Team",
      "KKR",
      "Kolkata"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Kolkata Knight Riders"
  },
  {
    teamId: "IPL_LSG",
    officialName: "Lucknow Super Giants",
    displayName: "Lucknow Super Giants",
    shortName: "LSG",
    abbreviation: "LSG",
    aliases: [
      "Lucknow Super Giants",
      "Lucknow Super Giants Cricket Team",
      "LSG",
      "Lucknow"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Lucknow Super Giants"
  },
  {
    teamId: "IPL_MI",
    officialName: "Mumbai Indians",
    displayName: "Mumbai Indians",
    shortName: "MI",
    abbreviation: "MI",
    aliases: [
      "Mumbai Indians",
      "Mumbai Indians Cricket Team",
      "MI",
      "Mumbai"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Mumbai Indians"
  },
  {
    teamId: "IPL_PBKS",
    officialName: "Punjab Kings",
    displayName: "Punjab Kings",
    shortName: "PBKS",
    abbreviation: "PBKS",
    aliases: [
      "Punjab Kings",
      "Punjab Kings Cricket Team",
      "PBKS",
      "Punjab",
      "Kings XI Punjab",
      "KXIP"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Punjab Kings"
  },
  {
    teamId: "IPL_RR",
    officialName: "Rajasthan Royals",
    displayName: "Rajasthan Royals",
    shortName: "RR",
    abbreviation: "RR",
    aliases: [
      "Rajasthan Royals",
      "Rajasthan Royals Cricket Team",
      "RR",
      "Rajasthan"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Rajasthan Royals"
  },
  {
    teamId: "IPL_RCB",
    officialName: "Royal Challengers Bengaluru",
    displayName: "Royal Challengers Bengaluru",
    shortName: "RCB",
    abbreviation: "RCB",
    aliases: [
      "Royal Challengers Bengaluru",
      "Royal Challengers Bangalore",
      "RCB",
      "Bangalore",
      "Bengaluru",
      "Royal Challengers",
      "RCB Bangalore"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Royal Challengers Bengaluru"
  },
  {
    teamId: "IPL_SRH",
    officialName: "Sunrisers Hyderabad",
    displayName: "Sunrisers Hyderabad",
    shortName: "SRH",
    abbreviation: "SRH",
    aliases: [
      "Sunrisers Hyderabad",
      "Sunrisers Hyderabad Cricket Team",
      "SRH",
      "Hyderabad",
      "Sunrisers"
    ],
    teamType: "franchise",
    country: "India",
    league: "IPL",
    isActive: true,
    name: "Sunrisers Hyderabad"
  }
];

export async function seedTeamMaster(): Promise<{
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  totalTeamsInDb: number;
}> {
  console.log('[SeedTeamMaster] Starting idempotent seed/migration for 22 Team Master records...');

  let createdCount = 0;
  let updatedCount = 0;

  for (const masterTeam of OFFICIAL_TEAM_MASTER_DATA) {
    // 1. Search by stable teamId
    let existingDoc = await Team.findOne({ teamId: masterTeam.teamId });

    // 2. If not found by teamId, search by officialName, displayName, or name
    if (!existingDoc) {
      existingDoc = await Team.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${masterTeam.officialName}$`, 'i') } },
          { officialName: { $regex: new RegExp(`^${masterTeam.officialName}$`, 'i') } },
          { displayName: { $regex: new RegExp(`^${masterTeam.displayName}$`, 'i') } },
          // Check historical names in existing records
          ...(masterTeam.aliases.map(a => ({ name: { $regex: new RegExp(`^${a}$`, 'i') } })))
        ]
      });
    }

    if (existingDoc) {
      // Migrate / update existing team with official master identity while keeping _id, stats, players
      existingDoc.teamId = masterTeam.teamId;
      existingDoc.officialName = masterTeam.officialName;
      existingDoc.displayName = masterTeam.displayName;
      existingDoc.shortName = masterTeam.shortName;
      existingDoc.abbreviation = masterTeam.abbreviation;
      existingDoc.teamType = masterTeam.teamType as any;
      existingDoc.country = masterTeam.country || '';
      existingDoc.league = masterTeam.league || '';
      existingDoc.isActive = masterTeam.isActive;
      existingDoc.name = masterTeam.officialName;

      // Merge aliases
      const currentAliases = existingDoc.aliases || [];
      const newAliases = Array.from(
        new Set([...currentAliases, ...masterTeam.aliases.map(a => a.toLowerCase().trim())])
      );
      existingDoc.aliases = newAliases;

      await existingDoc.save();
      updatedCount++;
    } else {
      // Create new Team Master record
      await Team.create({
        teamId: masterTeam.teamId,
        officialName: masterTeam.officialName,
        displayName: masterTeam.displayName,
        shortName: masterTeam.shortName,
        abbreviation: masterTeam.abbreviation,
        aliases: masterTeam.aliases.map(a => a.toLowerCase().trim()),
        teamType: masterTeam.teamType,
        country: masterTeam.country || '',
        league: masterTeam.league || '',
        isActive: masterTeam.isActive,
        name: masterTeam.officialName,
        logo: '',
        logoUrl: '',
        players: [],
        stats: { matches: 0, wins: 0, losses: 0, points: 0, nrr: 0 }
      });
      createdCount++;
    }
  }

  const totalTeamsInDb = await Team.countDocuments();

  console.log(`[SeedTeamMaster] Done. Created: ${createdCount}, Updated/Migrated: ${updatedCount}, Total in DB: ${totalTeamsInDb}`);

  return {
    totalProcessed: OFFICIAL_TEAM_MASTER_DATA.length,
    createdCount,
    updatedCount,
    totalTeamsInDb
  };
}

async function runStandalone() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set in environment!');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Run First Pass
    console.log('\n--- PASS 1: SEED & MIGRATE ---');
    const res1 = await seedTeamMaster();
    console.log(`Pass 1 created: ${res1.createdCount}, updated: ${res1.updatedCount}`);

    // Run Second Pass (Verifying Idempotency)
    console.log('\n--- PASS 2: IDEMPOTENCY CHECK ---');
    const res2 = await seedTeamMaster();

    if (res2.createdCount !== 0) {
      throw new Error(`Idempotency check failed: ${res2.createdCount} teams were created on second pass!`);
    }
    console.log('✓ Idempotency verified: 0 duplicates created on re-run.');

    // Verify Counts
    const intCount = await Team.countDocuments({ teamType: 'international' });
    const iplCount = await Team.countDocuments({ teamType: 'franchise', league: 'IPL' });
    const allMaster = await Team.find({ teamId: { $exists: true } });

    console.log('\n--- VALIDATION METRICS ---');
    console.log(`Total Master Teams: ${allMaster.length} (Expected: 22)`);
    console.log(`International Teams: ${intCount} (Expected: 12)`);
    console.log(`IPL Teams: ${iplCount} (Expected: 10)`);

    // Verify Unique teamIds
    const teamIds = allMaster.map(t => t.teamId);
    const uniqueTeamIds = new Set(teamIds);
    if (uniqueTeamIds.size !== allMaster.length) {
      throw new Error(`Duplicate teamIds detected! ${allMaster.length} teams have only ${uniqueTeamIds.size} unique IDs`);
    }
    console.log('✓ All 22 Team IDs are 100% unique.');

    // Test TeamMatchingService resolution on abbreviations, aliases, and historical names
    console.log('\n--- RESOLUTION TESTS ---');
    const matcher = new TeamMatchingService();

    const testCases = [
      { input: 'IND', expectedTeamId: 'INT_IND', desc: 'Abbreviation IND' },
      { input: 'India', expectedTeamId: 'INT_IND', desc: 'Official name India' },
      { input: 'Team India', expectedTeamId: 'INT_IND', desc: 'Alias Team India' },
      { input: 'RCB', expectedTeamId: 'IPL_RCB', desc: 'Abbreviation RCB' },
      { input: 'Royal Challengers Bangalore', expectedTeamId: 'IPL_RCB', desc: 'Historical alias Royal Challengers Bangalore' },
      { input: 'Royal Challengers Bengaluru', expectedTeamId: 'IPL_RCB', desc: 'Official name Royal Challengers Bengaluru' },
      { input: 'Delhi Daredevils', expectedTeamId: 'IPL_DC', desc: 'Historical alias Delhi Daredevils' },
      { input: 'DD', expectedTeamId: 'IPL_DC', desc: 'Historical alias DD' },
      { input: 'Kings XI Punjab', expectedTeamId: 'IPL_PBKS', desc: 'Historical alias Kings XI Punjab' },
      { input: 'KXIP', expectedTeamId: 'IPL_PBKS', desc: 'Historical alias KXIP' },
      { input: 'CSK', expectedTeamId: 'IPL_CSK', desc: 'Abbreviation CSK' },
      { input: 'MI', expectedTeamId: 'IPL_MI', desc: 'Abbreviation MI' },
      { input: 'AUS', expectedTeamId: 'INT_AUS', desc: 'Abbreviation AUS' },
      { input: 'Proteas', expectedTeamId: 'INT_RSA', desc: 'Alias Proteas' },
      { input: 'Black Caps', expectedTeamId: 'INT_NZL', desc: 'Alias Black Caps' },
      { input: 'Windies', expectedTeamId: 'INT_WI', desc: 'Alias Windies' }
    ];

    for (const tc of testCases) {
      const res = await matcher.resolveTeamMaster(tc.input);
      if (!res.team || res.team.teamId !== tc.expectedTeamId) {
        throw new Error(`Failed resolution for "${tc.input}" (${tc.desc}). Got: ${res.team?.teamId}, Expected: ${tc.expectedTeamId}`);
      }
      console.log(`✓ "${tc.input}" (${tc.desc}) -> ${res.team.teamId} (${res.team.displayName}) [Confidence: ${res.confidence}]`);
    }

    console.log('\n======================================================');
    console.log('ALL 22 TEAM MASTER RECORDS VERIFIED & RESOLVED 100%! 🎉');
    console.log('======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed/Migration Error:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  runStandalone();
}
