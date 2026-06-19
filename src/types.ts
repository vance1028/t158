export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Attraction {
  id: string;
  name: string;
  coordinates: Coordinates;
  city: string;
  openTime: string;
  closeTime: string;
  durationMinutes: number;
  ticketPrice: number;
  priority: number;
  category: string;
  selected: boolean;
}

export interface TripParams {
  days: number;
  dayStartTime: string;
  dayEndTime: string;
  startPoint: Coordinates;
  startPointName: string;
  lodgingPoints: { day: number; coordinates: Coordinates; name: string }[];
  maxDurationMinutes: number;
  roadCoefficient: number;
}

export interface TimelineEvent {
  type: 'departure' | 'arrival' | 'activity' | 'drive' | 'lodging';
  time: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  attractionId?: string;
  coordinates?: Coordinates;
}

export interface DayPlan {
  day: number;
  date?: string;
  events: TimelineEvent[];
  totalDriveMinutes: number;
  totalActivityMinutes: number;
  totalMinutes: number;
  startPoint: Coordinates;
  endPoint: Coordinates;
  startPointName: string;
  endPointName: string;
}

export type UnassignedReason =
  | 'time_insufficient'
  | 'closed_upon_arrival'
  | 'priority_too_low'
  | 'cross_area_backtrack';

export interface UnassignedAttraction {
  attractionId: string;
  reason: UnassignedReason;
  detail: string;
}

export interface TripPlan {
  days: DayPlan[];
  unassigned: UnassignedAttraction[];
  generatedAt: number;
}

export type ScheduleStrategy = 'heuristic' | 'greedy_priority' | 'nearest_neighbor';

export interface AppState {
  attractions: Attraction[];
  tripParams: TripParams;
  tripPlan: TripPlan | null;
  selectedStrategy: ScheduleStrategy;
}
