import { Player } from '../models/Player';
import { Team } from '../models/Team';
import { StatsService } from './StatsService';
import { cacheManager } from '../utils/cacheManager';

export class AutoUpdateService {
  private static instance: AutoUpdateService;
  private isUpdating = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private lastUpdateTime: Date | null = null;
  private statsService: StatsService;

  private constructor() {
    this.statsService = new StatsService();
  }

  public static getInstance(): AutoUpdateService {
    if (!AutoUpdateService.instance) {
      AutoUpdateService.instance = new AutoUpdateService();
    }
    return AutoUpdateService.instance;
  }

  /**
   * Run full recalculation of players, teams, rankings and flush cache
   */
  public async performFullStatsUpdate(): Promise<{
    success: boolean;
    playersCount: number;
    teamsCount: number;
    durationMs: number;
    lastUpdateTime: Date;
  }> {
    if (this.isUpdating) {
      console.log('⏳ [AutoUpdate] Update already in progress, skipping duplicate call.');
      return {
        success: false,
        playersCount: 0,
        teamsCount: 0,
        durationMs: 0,
        lastUpdateTime: this.lastUpdateTime || new Date(),
      };
    }

    this.isUpdating = true;
    const start = Date.now();
    console.log('🔄 [AutoUpdate] Starting automated full stats recalculation and cache flush...');

    try {
      // 1. Recalculate all players
      const players = await Player.find({});
      let updatedPlayers = 0;
      for (const player of players) {
        try {
          await this.statsService.recalculatePlayerCareer(player._id as any);
          updatedPlayers++;
        } catch (err: any) {
          console.warn(`[AutoUpdate] Warning: Player ${player.name} career stats recalculation failed:`, err.message);
        }
      }

      // 2. Recalculate all teams
      const teams = await Team.find({});
      let updatedTeams = 0;
      for (const team of teams) {
        try {
          await this.statsService.recalculateTeamStats(team._id as any);
          updatedTeams++;
        } catch (err: any) {
          console.warn(`[AutoUpdate] Warning: Team ${team.name} stats recalculation failed:`, err.message);
        }
      }

      // 3. Invalidate in-memory cache
      cacheManager.clear();
      this.lastUpdateTime = new Date();
      const durationMs = Date.now() - start;

      console.log(
        `✅ [AutoUpdate] Automated update complete in ${durationMs}ms: ${updatedPlayers} players, ${updatedTeams} teams updated.`
      );

      return {
        success: true,
        playersCount: updatedPlayers,
        teamsCount: updatedTeams,
        durationMs,
        lastUpdateTime: this.lastUpdateTime,
      };
    } catch (error) {
      console.error('❌ [AutoUpdate] Error during automated stats update:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Start recurring background timer (default: every 60 minutes)
   */
  public startBackgroundScheduler(intervalMinutes = 60): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    console.log(
      `⏱️ [AutoUpdate] Background scheduler initialized: updates stats every ${intervalMinutes} minutes.`
    );

    // Initial non-blocking update 15 seconds after server boot
    setTimeout(() => {
      this.performFullStatsUpdate().catch((err) =>
        console.error('[AutoUpdate] Initial startup sync error:', err.message)
      );
    }, 15000);

    // Periodic interval
    this.intervalTimer = setInterval(() => {
      this.performFullStatsUpdate().catch((err) =>
        console.error('[AutoUpdate] Periodic sync error:', err.message)
      );
    }, intervalMinutes * 60 * 1000);
  }

  public getStatus() {
    return {
      isUpdating: this.isUpdating,
      lastUpdateTime: this.lastUpdateTime,
    };
  }
}

export default AutoUpdateService;
