export * from './auth';
export * from './crm';
export * from './inventory';
export * from './finance';
export * from './support';

export interface TenantSettings {
  nomEntreprise: string;
  devise: string;
  langue: string;
  timezone: string;
  logoUrl?: string;
  phone?: string;
  country?: string;
}
