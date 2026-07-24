import BaseRepository from './BaseRepository';
import { Notification } from '../models/Notification';
import { INotification } from '../types';

export class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(Notification);
  }
}
