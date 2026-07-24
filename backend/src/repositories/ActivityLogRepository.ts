import BaseRepository from './BaseRepository';
import { ActivityLog } from '../models/ActivityLog';
import { IActivityLog } from '../types';

export class ActivityLogRepository extends BaseRepository<IActivityLog> {
  constructor() {
    super(ActivityLog);
  }
}
