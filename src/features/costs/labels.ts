import type { Fueling, Maintenance } from '@/api/types';

export type MaintenanceType = Maintenance['type'];
export type FuelType = Fueling['fuelType'];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
  OIL_CHANGE: 'Troca de óleo',
  TIRES: 'Pneus',
  MECHANICAL: 'Mecânica',
  ELECTRICAL: 'Elétrica',
  OTHER: 'Outra',
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  DIESEL: 'Diesel',
  DIESEL_S10: 'Diesel S10',
  GASOLINE: 'Gasolina',
  ETHANOL: 'Etanol',
  CNG: 'GNV',
  OTHER: 'Outro',
};
