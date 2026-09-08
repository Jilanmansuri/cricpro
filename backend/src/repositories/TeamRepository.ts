import BaseRepository from './BaseRepository';
import { Team } from '../models/Team';
import { ITeam } from '../types';
import { ClientSession } from 'mongoose';

export class TeamRepository extends BaseRepository<ITeam> {
  constructor() {
    super(Team);
  }

  async findByName(name: string, session?: ClientSession): Promise<ITeam | null> {
    if (!name || !name.trim()) return null;
    return await this.model.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        { officialName: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        { displayName: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        { shortName: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
      ]
    }).session(session || null).exec();
  }

  async findByTeamId(teamId: string, session?: ClientSession): Promise<ITeam | null> {
    if (!teamId || !teamId.trim()) return null;
    return await this.model.findOne({
      teamId: { $regex: new RegExp(`^${teamId.trim()}$`, 'i') }
    }).session(session || null).exec();
  }

  async findByAbbreviation(abbr: string, session?: ClientSession): Promise<ITeam | null> {
    if (!abbr || !abbr.trim()) return null;
    return await this.model.findOne({
      abbreviation: { $regex: new RegExp(`^${abbr.trim()}$`, 'i') }
    }).session(session || null).exec();
  }

  async findByAlias(alias: string, session?: ClientSession): Promise<ITeam | null> {
    if (!alias || !alias.trim()) return null;
    const clean = alias.trim().toLowerCase();
    return await this.model.findOne({
      aliases: clean
    }).session(session || null).exec();
  }

  async upsertMasterTeam(teamData: Partial<ITeam>, session?: ClientSession): Promise<ITeam> {
    const identifier = teamData.teamId || teamData.abbreviation;
    let existing: ITeam | null = null;

    if (identifier) {
      existing = await this.findByTeamId(identifier, session);
    }

    if (!existing && (teamData.officialName || teamData.name)) {
      const nameToSearch = (teamData.officialName || teamData.name)!;
      existing = await this.findByName(nameToSearch, session);
    }

    if (existing) {
      Object.assign(existing, teamData);
      if (teamData.aliases && Array.isArray(teamData.aliases)) {
        const mergedAliases = Array.from(new Set([...(existing.aliases || []), ...teamData.aliases.map(a => a.toLowerCase().trim())]));
        existing.aliases = mergedAliases;
      }
      return await existing.save({ session });
    }

    return await this.create(teamData, session);
  }

  async findAllMaster(filters: any = {}, session?: ClientSession): Promise<ITeam[]> {
    return await this.model.find(filters).session(session || null).exec();
  }
}

export default TeamRepository;
