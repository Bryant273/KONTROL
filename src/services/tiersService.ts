import { BaseFirestoreService } from './baseFirestoreService';
import { Tiers } from '../types';

export class TiersService extends BaseFirestoreService<Tiers> {
  constructor() {
    super('tiers');
  }
}

export const tiersService = new TiersService();
