import { Types } from 'mongoose';
import { PlayerMatchStatsRepository } from '../repositories/PlayerMatchStatsRepository';
import { CareerStatsRepository } from '../repositories/CareerStatsRepository';
import { TeamRepository } from '../repositories/TeamRepository';
import { MatchRepository } from '../repositories/MatchRepository';
import { PointsTableRepository } from '../repositories/PointsTableRepository';

export class StatsService {
  private playerMatchStatsRepository: PlayerMatchStatsRepository;
  private careerStatsRepository: CareerStatsRepository;
  private teamRepository: TeamRepository;
  private matchRepository: MatchRepository;
  private pointsTableRepository: PointsTableRepository;

  constructor() {
    this.playerMatchStatsRepository = new PlayerMatchStatsRepository();
    this.careerStatsRepository = new CareerStatsRepository();
    this.teamRepository = new TeamRepository();
    this.matchRepository = new MatchRepository();
    this.pointsTableRepository = new PointsTableRepository();
  }

  private addOvers(o1: number, o2: number): number {
    const balls1 = Math.floor(o1) * 6 + Math.round((o1 % 1) * 10);
    const balls2 = Math.floor(o2) * 6 + Math.round((o2 % 1) * 10);
    const totalBalls = balls1 + balls2;
    const overs = Math.floor(totalBalls / 6);
    const remainderBalls = totalBalls % 6;
    return overs + remainderBalls / 10;
  }

  private oversToBalls(overs: number): number {
    return Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
  }

  public async recalculatePlayerCareer(playerId: Types.ObjectId): Promise<void> {
    const matchStatsList = await this.playerMatchStatsRepository.find({ playerId }, {});
    const matchesCount = matchStatsList.length;

    let runs = 0;
    let balls = 0;
    let fours = 0;
    let sixes = 0;
    let fifties = 0;
    let hundreds = 0;
    let ducks = 0;
    let highestScore = 0;
    let notOuts = 0;

    let oversBowled = 0;
    let maidens = 0;
    let runsConceded = 0;
    let wickets = 0;
    let bestWickets = 0;
    let bestRunsConceded = 999;

    let catches = 0;
    let stumpings = 0;
    let runOuts = 0;

    for (const stats of matchStatsList) {
      if (!stats.batting.didNotBat) {
        const r = stats.batting.runs;
        runs += r;
        balls += stats.batting.balls;
        fours += stats.batting.fours;
        sixes += stats.batting.sixes;

        if (stats.batting.outStatus === 'not_out') {
          notOuts++;
        }

        if (r > highestScore) {
          highestScore = r;
        }

        if (r >= 100) {
          hundreds++;
        } else if (r >= 50) {
          fifties++;
        }

        if (r === 0 && stats.batting.outStatus !== 'not_out') {
          ducks++;
        }
      }

      if (!stats.bowling.didNotBowl) {
        oversBowled = this.addOvers(oversBowled, stats.bowling.overs);
        maidens += stats.bowling.maidens;
        runsConceded += stats.bowling.runsConceded;
        wickets += stats.bowling.wickets;

        const w = stats.bowling.wickets;
        const rCon = stats.bowling.runsConceded;

        if (w > bestWickets || (w === bestWickets && rCon < bestRunsConceded)) {
          bestWickets = w;
          bestRunsConceded = rCon;
        }
      }

      catches += stats.fielding.catches;
      stumpings += stats.fielding.stumpings;
      runOuts += stats.fielding.runOuts;
    }

    const matchIds = matchStatsList.map(s => s.matchId);
    const matches = await this.matchRepository.find({ _id: { $in: matchIds } });
    
    let wins = 0;
    let losses = 0;
    let mvps = 0;

    for (const match of matches) {
      if (match.mvp?.toString() === playerId.toString()) {
        mvps++;
      }

      const statsForMatch = matchStatsList.find(s => s.matchId.toString() === match._id.toString());
      if (statsForMatch) {
        const playerTeamId = statsForMatch.teamId.toString();
        const isTeamA = match.teamA.toString() === playerTeamId;
        const resultText = (match.result || '').toLowerCase();

        const teamA = await this.teamRepository.findById(match.teamA, undefined);
        const teamB = await this.teamRepository.findById(match.teamB, undefined);
        const teamAName = teamA?.name.toLowerCase() || 'team a';
        const teamBName = teamB?.name.toLowerCase() || 'team b';

        if (resultText.includes('draw') || resultText.includes('tie')) {
          // Tied
        } else if (
          (isTeamA && resultText.includes(teamAName)) ||
          (!isTeamA && resultText.includes(teamBName))
        ) {
          wins++;
        } else {
          losses++;
        }
      }
    }

    await this.careerStatsRepository.updateOne(
      { playerId },
      {
        batting: {
          matches: matchesCount,
          runs,
          balls,
          fours,
          sixes,
          fifties,
          hundreds,
          ducks,
          highestScore,
          notOuts,
        },
        bowling: {
          overs: oversBowled,
          maidens,
          runsConceded,
          wickets,
          bestBowling: {
            wickets: bestWickets,
            runs: bestRunsConceded === 999 ? 0 : bestRunsConceded,
          },
        },
        fielding: {
          catches,
          stumpings,
          runOuts,
        },
        wins,
        losses,
        mvps,
      },
      undefined,
      true
    );
  }

  public async recalculateTeamStats(teamId: Types.ObjectId): Promise<void> {
    const matches = await this.matchRepository.find({
      $or: [{ teamA: teamId }, { teamB: teamId }]
    });

    const team = await this.teamRepository.findById(teamId, undefined);
    if (!team) return;

    let played = 0;
    let wins = 0;
    let losses = 0;
    let points = 0;

    let totalRunsScored = 0;
    let totalOversFaced = 0;
    let totalRunsConceded = 0;
    let totalOversBowled = 0;

    for (const match of matches) {
      played++;
      const isTeamA = match.teamA.toString() === teamId.toString();
      const resultText = match.result.toLowerCase();
      const teamNameLower = team.name.toLowerCase();

      if (resultText.includes('tie') || resultText.includes('draw')) {
        points += 1;
      } else if (resultText.includes(teamNameLower)) {
        wins++;
        points += 2;
      } else {
        losses++;
      }

      const matchOversLimit = match.overs;

      if (isTeamA) {
        totalRunsScored += match.teamAScore.runs;
        const teamAFacedBalls = match.teamAScore.wickets === 10
          ? matchOversLimit * 6
          : this.oversToBalls(match.teamAScore.overs);
        totalOversFaced += teamAFacedBalls / 6;

        totalRunsConceded += match.teamBScore.runs;
        const teamBBalled = match.teamBScore.wickets === 10
          ? matchOversLimit * 6
          : this.oversToBalls(match.teamBScore.overs);
        totalOversBowled += teamBBalled / 6;
      } else {
        totalRunsScored += match.teamBScore.runs;
        const teamBFacedBalls = match.teamBScore.wickets === 10
          ? matchOversLimit * 6
          : this.oversToBalls(match.teamBScore.overs);
        totalOversFaced += teamBFacedBalls / 6;

        totalRunsConceded += match.teamAScore.runs;
        const teamABalled = match.teamAScore.wickets === 10
          ? matchOversLimit * 6
          : this.oversToBalls(match.teamAScore.overs);
        totalOversBowled += teamABalled / 6;
      }
    }

    let nrr = 0;
    const battingRate = totalOversFaced > 0 ? totalRunsScored / totalOversFaced : 0;
    const bowlingRate = totalOversBowled > 0 ? totalRunsConceded / totalOversBowled : 0;
    nrr = parseFloat((battingRate - bowlingRate).toFixed(3));

    await this.teamRepository.update(teamId, {
      stats: {
        matches: played,
        wins,
        losses,
        points,
        nrr
      }
    });
  }

  public async recalculateTournamentPointsTable(tournamentId: Types.ObjectId): Promise<void> {
    const matches = await this.matchRepository.find({ tournamentId }, {});

    const teamIds = new Set<string>();
    for (const match of matches) {
      teamIds.add(match.teamA.toString());
      teamIds.add(match.teamB.toString());
    }

    for (const idStr of teamIds) {
      const teamId = new Types.ObjectId(idStr);
      const teamMatches = matches.filter(
        m => m.teamA.toString() === idStr || m.teamB.toString() === idStr
      );

      const team = await this.teamRepository.findById(teamId, undefined);
      if (!team) continue;

      let played = 0;
      let won = 0;
      let lost = 0;
      let tied = 0;
      let points = 0;

      let totalRunsScored = 0;
      let totalOversFaced = 0;
      let totalRunsConceded = 0;
      let totalOversBowled = 0;

      for (const match of teamMatches) {
        played++;
        const isTeamA = match.teamA.toString() === idStr;
        const resultText = match.result.toLowerCase();
        const teamNameLower = team.name.toLowerCase();

        if (resultText.includes('tie') || resultText.includes('draw')) {
          tied++;
          points += 1;
        } else if (resultText.includes(teamNameLower)) {
          won++;
          points += 2;
        } else {
          lost++;
        }

        const matchOversLimit = match.overs;
        if (isTeamA) {
          totalRunsScored += match.teamAScore.runs;
          const teamAFacedBalls = match.teamAScore.wickets === 10
            ? matchOversLimit * 6
            : this.oversToBalls(match.teamAScore.overs);
          totalOversFaced += teamAFacedBalls / 6;

          totalRunsConceded += match.teamBScore.runs;
          const teamBBalled = match.teamBScore.wickets === 10
            ? matchOversLimit * 6
            : this.oversToBalls(match.teamBScore.overs);
          totalOversBowled += teamBBalled / 6;
        } else {
          totalRunsScored += match.teamBScore.runs;
          const teamBFacedBalls = match.teamBScore.wickets === 10
            ? matchOversLimit * 6
            : this.oversToBalls(match.teamBScore.overs);
          totalOversFaced += teamBFacedBalls / 6;

          totalRunsConceded += match.teamAScore.runs;
          const teamABalled = match.teamAScore.wickets === 10
            ? matchOversLimit * 6
            : this.oversToBalls(match.teamAScore.overs);
          totalOversBowled += teamABalled / 6;
        }
      }

      let nrr = 0;
      const battingRate = totalOversFaced > 0 ? totalRunsScored / totalOversFaced : 0;
      const bowlingRate = totalOversBowled > 0 ? totalRunsConceded / totalOversBowled : 0;
      nrr = parseFloat((battingRate - bowlingRate).toFixed(3));

      await this.pointsTableRepository.updateOne(
        { tournamentId, teamId },
        {
          played,
          won,
          lost,
          tied,
          nrr,
          points
        }
      );
    }
  }
}
export default StatsService;
