import { createContext, useContext, useEffect, useReducer, ReactNode, useMemo, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  Attraction,
  TripParams,
  TripPlan,
  ScheduleStrategy,
  UnassignedReason
} from '../types';
import { scheduleTrip } from '../scheduler';
import {
  loadFromStorage,
  saveToStorage,
  exportJSON,
  importJSON
} from '../utils/storage';
import { formatDuration } from '../utils/time';

type Action =
  | { type: 'ADD_ATTRACTION'; payload: Omit<Attraction, 'id'> }
  | { type: 'UPDATE_ATTRACTION'; payload: Attraction }
  | { type: 'DELETE_ATTRACTION'; payload: string }
  | { type: 'TOGGLE_ATTRACTION'; payload: string }
  | { type: 'SET_TRIP_PARAMS'; payload: Partial<TripParams> }
  | { type: 'SET_STRATEGY'; payload: ScheduleStrategy }
  | { type: 'GENERATE_PLAN' }
  | { type: 'IMPORT_STATE'; payload: ReturnType<typeof importJSON> & {} }
  | { type: 'RESET_ALL' };

interface State {
  attractions: Attraction[];
  tripParams: TripParams;
  tripPlan: TripPlan | null;
  selectedStrategy: ScheduleStrategy;
}

interface AppContextValue extends State {
  dispatch: React.Dispatch<Action>;
  addAttraction: (a: Omit<Attraction, 'id'>) => void;
  updateAttraction: (a: Attraction) => void;
  deleteAttraction: (id: string) => void;
  toggleAttraction: (id: string) => void;
  setTripParams: (p: Partial<TripParams>) => void;
  setStrategy: (s: ScheduleStrategy) => void;
  generatePlan: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
  getAttractionById: (id: string) => Attraction | undefined;
  formatUnassignedReason: (r: UnassignedReason) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ATTRACTION': {
      const newAttr: Attraction = { ...action.payload, id: uuid() };
      return { ...state, attractions: [...state.attractions, newAttr], tripPlan: null };
    }
    case 'UPDATE_ATTRACTION': {
      return {
        ...state,
        attractions: state.attractions.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
        tripPlan: null
      };
    }
    case 'DELETE_ATTRACTION': {
      return {
        ...state,
        attractions: state.attractions.filter(a => a.id !== action.payload),
        tripPlan: null
      };
    }
    case 'TOGGLE_ATTRACTION': {
      return {
        ...state,
        attractions: state.attractions.map(a =>
          a.id === action.payload ? { ...a, selected: !a.selected } : a
        ),
        tripPlan: null
      };
    }
    case 'SET_TRIP_PARAMS': {
      const newParams = { ...state.tripParams, ...action.payload };
      if (action.payload.days !== undefined && action.payload.days !== state.tripParams.days) {
        const newDays = action.payload.days;
        const existingLodgings = [...state.tripParams.lodgingPoints];
        const newLodgings = [];
        for (let d = 1; d <= newDays; d++) {
          const found = existingLodgings.find(l => l.day === d);
          if (found) newLodgings.push(found);
          else newLodgings.push({ day: d, coordinates: state.tripParams.startPoint, name: state.tripParams.startPointName });
        }
        newParams.lodgingPoints = newLodgings;
      }
      return { ...state, tripParams: newParams, tripPlan: null };
    }
    case 'SET_STRATEGY': {
      return { ...state, selectedStrategy: action.payload, tripPlan: null };
    }
    case 'GENERATE_PLAN': {
      const plan = scheduleTrip(state.attractions, state.tripParams, state.selectedStrategy);
      return { ...state, tripPlan: plan };
    }
    case 'IMPORT_STATE': {
      if (!action.payload) return state;
      return {
        attractions: action.payload.attractions,
        tripParams: action.payload.tripParams,
        tripPlan: action.payload.tripPlan,
        selectedStrategy: action.payload.selectedStrategy
      };
    }
    case 'RESET_ALL': {
      localStorage.removeItem('trip_planner_state_v1');
      const initial = loadFromStorage();
      return { ...initial };
    }
    default:
      return state;
  }
}

const UNASSIGNED_REASON_MAP: Record<UnassignedReason, string> = {
  time_insufficient: '时间不足',
  closed_upon_arrival: '到达时已闭馆',
  priority_too_low: '优先级较低',
  cross_area_backtrack: '跨片区来回'
};

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadFromStorage(), []);
  const [state, dispatch] = useReducer(reducer, initial as State);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const addAttraction = useCallback((a: Omit<Attraction, 'id'>) => {
    dispatch({ type: 'ADD_ATTRACTION', payload: a });
  }, []);

  const updateAttraction = useCallback((a: Attraction) => {
    dispatch({ type: 'UPDATE_ATTRACTION', payload: a });
  }, []);

  const deleteAttraction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ATTRACTION', payload: id });
  }, []);

  const toggleAttraction = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_ATTRACTION', payload: id });
  }, []);

  const setTripParams = useCallback((p: Partial<TripParams>) => {
    dispatch({ type: 'SET_TRIP_PARAMS', payload: p });
  }, []);

  const setStrategy = useCallback((s: ScheduleStrategy) => {
    dispatch({ type: 'SET_STRATEGY', payload: s });
  }, []);

  const generatePlan = useCallback(() => {
    dispatch({ type: 'GENERATE_PLAN' });
  }, []);

  const exportData = useCallback(() => {
    return exportJSON(state);
  }, [state]);

  const importData = useCallback((json: string): boolean => {
    const result = importJSON(json);
    if (result) {
      dispatch({ type: 'IMPORT_STATE', payload: result as any });
      return true;
    }
    return false;
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  const getAttractionById = useCallback(
    (id: string) => state.attractions.find(a => a.id === id),
    [state.attractions]
  );

  const formatUnassignedReason = useCallback((r: UnassignedReason) => {
    return UNASSIGNED_REASON_MAP[r] || r;
  }, []);

  const value: AppContextValue = {
    ...state,
    dispatch,
    addAttraction,
    updateAttraction,
    deleteAttraction,
    toggleAttraction,
    setTripParams,
    setStrategy,
    generatePlan,
    exportData,
    importData,
    resetAll,
    getAttractionById,
    formatUnassignedReason
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { formatDuration };
