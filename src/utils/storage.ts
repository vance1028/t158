import type { Attraction, TripParams, TripPlan, ScheduleStrategy } from '../types';
import { defaultAttractions } from '../data/defaultAttractions';
import { defaultTripParams } from '../data/defaultTripParams';

const STORAGE_KEY = 'trip_planner_state_v1';

interface StoredState {
  attractions: Attraction[];
  tripParams: TripParams;
  tripPlan: TripPlan | null;
  selectedStrategy: ScheduleStrategy;
  savedAt: number;
}

export function loadFromStorage(): {
  attractions: Attraction[];
  tripParams: TripParams;
  tripPlan: TripPlan | null;
  selectedStrategy: ScheduleStrategy;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        attractions: defaultAttractions,
        tripParams: defaultTripParams,
        tripPlan: null,
        selectedStrategy: 'heuristic'
      };
    }
    const parsed = JSON.parse(raw) as StoredState;
    return {
      attractions: parsed.attractions ?? defaultAttractions,
      tripParams: parsed.tripParams ?? defaultTripParams,
      tripPlan: parsed.tripPlan ?? null,
      selectedStrategy: parsed.selectedStrategy ?? 'heuristic'
    };
  } catch {
    return {
      attractions: defaultAttractions,
      tripParams: defaultTripParams,
      tripPlan: null,
      selectedStrategy: 'heuristic'
    };
  }
}

export function saveToStorage(state: {
  attractions: Attraction[];
  tripParams: TripParams;
  tripPlan: TripPlan | null;
  selectedStrategy: ScheduleStrategy;
}): void {
  try {
    const stored: StoredState = {
      ...state,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function exportJSON(state: {
  attractions: Attraction[];
  tripParams: TripParams;
  tripPlan: TripPlan | null;
  selectedStrategy: ScheduleStrategy;
}): string {
  return JSON.stringify(
    { ...state, exportedAt: new Date().toISOString() },
    null,
    2
  );
}

export function importJSON(jsonStr: string): {
  attractions: Attraction[];
  tripParams: TripParams;
  tripPlan: TripPlan | null;
  selectedStrategy: ScheduleStrategy;
} | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.attractions || !parsed.tripParams) {
      return null;
    }
    return {
      attractions: parsed.attractions,
      tripParams: parsed.tripParams,
      tripPlan: parsed.tripPlan ?? null,
      selectedStrategy: parsed.selectedStrategy ?? 'heuristic'
    };
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
