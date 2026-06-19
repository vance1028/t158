import type { TripParams } from '../types';

export const defaultTripParams: TripParams = {
  days: 3,
  dayStartTime: '09:00',
  dayEndTime: '18:00',
  startPoint: { lat: 39.9042, lng: 116.4074 },
  startPointName: '北京前门酒店',
  lodgingPoints: [
    { day: 1, coordinates: { lat: 39.9042, lng: 116.4074 }, name: '北京前门酒店' },
    { day: 2, coordinates: { lat: 39.9042, lng: 116.4074 }, name: '北京前门酒店' },
    { day: 3, coordinates: { lat: 39.9042, lng: 116.4074 }, name: '北京前门酒店' }
  ],
  maxDurationMinutes: 540,
  roadCoefficient: 1.4
};
