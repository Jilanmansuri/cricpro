const fs = require('fs');
const path = 'd:/CG VS code folder/cricpro/backend/src/services/StatsService.ts';
let code = fs.readFileSync(path, 'utf8');

// Add import mongoose
if (!code.includes("import mongoose")) {
  code = code.replace("import { Types } from 'mongoose';", "import mongoose, { Types } from 'mongoose';");
}

// Add session to method signatures
code = code.replace(/public async recalculatePlayerCareer\(playerId: Types\.ObjectId\): Promise<void> \{/g, 'public async recalculatePlayerCareer(playerId: Types.ObjectId, session?: mongoose.ClientSession): Promise<void> {');
code = code.replace(/public async recalculateTeamStats\(teamId: Types\.ObjectId\): Promise<void> \{/g, 'public async recalculateTeamStats(teamId: Types.ObjectId, session?: mongoose.ClientSession): Promise<void> {');
code = code.replace(/public async recalculateTournamentPointsTable\(tournamentId: Types\.ObjectId\): Promise<void> \{/g, 'public async recalculateTournamentPointsTable(tournamentId: Types.ObjectId, session?: mongoose.ClientSession): Promise<void> {');

// Update repository calls
code = code.replace(/this\.playerMatchStatsRepository\.find\(\{([^}]+)\}\)/g, 'this.playerMatchStatsRepository.find({$1}, { session })');
code = code.replace(/this\.matchRepository\.find\(\{([^}]+)\}\)/g, 'this.matchRepository.find({$1}, { session })');
code = code.replace(/this\.teamRepository\.findById\(([^)]+)\)/g, 'this.teamRepository.findById($1, undefined, session)');
code = code.replace(/this\.careerStatsRepository\.updateOne\(([^,]+),\s*\{([^}]+)\}\)/g, 'this.careerStatsRepository.updateOne($1, {$2}, session)');
code = code.replace(/this\.careerStatsRepository\.findOne\(\{([^}]+)\}\)/g, 'this.careerStatsRepository.findOne({$1}, undefined, session)');
code = code.replace(/this\.careerStatsRepository\.create\(\{([^}]+)\}\)/g, 'this.careerStatsRepository.create({$1}, session)');
code = code.replace(/this\.teamRepository\.updateOne\(([^,]+),\s*\{([^}]+)\}\)/g, 'this.teamRepository.updateOne($1, {$2}, session)');
code = code.replace(/this\.pointsTableRepository\.find\(\{([^}]+)\}\)/g, 'this.pointsTableRepository.find({$1}, { session })');
code = code.replace(/this\.pointsTableRepository\.updateOne\(([^,]+),\s*\{([^}]+)\}\)/g, 'this.pointsTableRepository.updateOne($1, {$2}, session)');
code = code.replace(/this\.pointsTableRepository\.create\(\{([^}]+)\}\)/g, 'this.pointsTableRepository.create({$1}, session)');

fs.writeFileSync(path, code);
console.log('StatsService updated successfully');
