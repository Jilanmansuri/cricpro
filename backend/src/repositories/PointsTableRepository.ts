import BaseRepository from './BaseRepository';
import { PointsTable } from '../models/PointsTable';
import { IPointsTable } from '../types';

export class PointsTableRepository extends BaseRepository<IPointsTable> {
  constructor() {
    super(PointsTable);
  }
}
