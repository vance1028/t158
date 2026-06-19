import type {
  Attraction,
  TripParams,
  TripPlan,
  DayPlan,
  TimelineEvent,
  UnassignedAttraction,
  UnassignedReason,
  Coordinates,
  ScheduleStrategy
} from '../types';
import {
  timeToMinutes,
  minutesToTime,
  estimateDriveMinutes,
  haversineDistance
} from '../utils/time';

export interface ScheduleContext {
  attractions: Attraction[];
  params: TripParams;
}

export interface ScheduleResult {
  plan: TripPlan;
}

export type ScheduleStrategyFn = (ctx: ScheduleContext) => ScheduleResult;

const CROSS_CITY_PENALTY = 50;

function getLodgingForDay(params: TripParams, day: number): { coordinates: Coordinates; name: string } {
  const found = params.lodgingPoints.find(l => l.day === day);
  if (found) return { coordinates: found.coordinates, name: found.name };
  return { coordinates: params.startPoint, name: params.startPointName };
}

function getStartForDay(params: TripParams, day: number): { coordinates: Coordinates; name: string } {
  if (day === 1) {
    return { coordinates: params.startPoint, name: params.startPointName };
  }
  return getLodgingForDay(params, day - 1);
}

function addUnassigned(
  list: UnassignedAttraction[],
  id: string,
  reason: UnassignedReason,
  detail: string
) {
  if (!list.some(u => u.attractionId === id)) {
    list.push({ attractionId: id, reason, detail });
  }
}

function buildDayEvents(
  day: number,
  orderedAttractions: Attraction[],
  ctx: ScheduleContext,
  driveCache: Map<string, number>
): { events: TimelineEvent[]; drive: number; activity: number; total: number } | null {
  const { params } = ctx;
  const startInfo = getStartForDay(params, day);
  const endInfo = getLodgingForDay(params, day);
  const dayStart = timeToMinutes(params.dayStartTime);
  const dayEnd = timeToMinutes(params.dayEndTime);

  const events: TimelineEvent[] = [];
  let currentTime = dayStart;
  let currentCoord = startInfo.coordinates;
  let totalDrive = 0;
  let totalActivity = 0;

  events.push({
    type: 'departure',
    time: minutesToTime(currentTime),
    title: `从「${startInfo.name}」出发`,
    coordinates: startInfo.coordinates
  });

  for (const attr of orderedAttractions) {
    const cacheKey = `${currentCoord.lat},${currentCoord.lng}->${attr.coordinates.lat},${attr.coordinates.lng}`;
    let driveMin = driveCache.get(cacheKey);
    if (driveMin === undefined) {
      driveMin = estimateDriveMinutes(currentCoord, attr.coordinates, params.roadCoefficient);
      driveCache.set(cacheKey, driveMin);
    }

    const arrivalTime = currentTime + driveMin;
    const openMin = timeToMinutes(attr.openTime);
    const closeMin = timeToMinutes(attr.closeTime);

    if (arrivalTime < openMin) {
      events.push({
        type: 'drive',
        time: minutesToTime(currentTime),
        title: `驾车前往「${attr.name}」`,
        description: `约 ${driveMin} 分钟`,
        durationMinutes: driveMin
      });
      currentTime = openMin;
      events.push({
        type: 'arrival',
        time: minutesToTime(currentTime),
        title: `抵达「${attr.name}」（等待开门）`,
        coordinates: attr.coordinates,
        attractionId: attr.id
      });
    } else {
      events.push({
        type: 'drive',
        time: minutesToTime(currentTime),
        title: `驾车前往「${attr.name}」`,
        description: `约 ${driveMin} 分钟`,
        durationMinutes: driveMin
      });
      events.push({
        type: 'arrival',
        time: minutesToTime(arrivalTime),
        title: `抵达「${attr.name}」`,
        coordinates: attr.coordinates,
        attractionId: attr.id
      });
      currentTime = arrivalTime;
    }

    if (currentTime >= closeMin) {
      return null;
    }

    const actualDuration = Math.min(attr.durationMinutes, closeMin - currentTime);
    events.push({
      type: 'activity',
      time: minutesToTime(currentTime),
      title: `游览「${attr.name}」`,
      description: `建议游玩约 ${actualDuration} 分钟 · 门票 ¥${attr.ticketPrice}`,
      durationMinutes: actualDuration,
      attractionId: attr.id,
      coordinates: attr.coordinates
    });
    totalDrive += driveMin;
    totalActivity += actualDuration;
    currentTime += actualDuration;
    currentCoord = attr.coordinates;
  }

  const cacheKey2 = `${currentCoord.lat},${currentCoord.lng}->${endInfo.coordinates.lat},${endInfo.coordinates.lng}`;
  let finalDrive = driveCache.get(cacheKey2);
  if (finalDrive === undefined) {
    finalDrive = estimateDriveMinutes(currentCoord, endInfo.coordinates, params.roadCoefficient);
    driveCache.set(cacheKey2, finalDrive);
  }

  if (currentTime + finalDrive > dayEnd) {
    return null;
  }

  events.push({
    type: 'drive',
    time: minutesToTime(currentTime),
    title: `驾车返回「${endInfo.name}」`,
    description: `约 ${finalDrive} 分钟`,
    durationMinutes: finalDrive
  });
  currentTime += finalDrive;
  totalDrive += finalDrive;

  events.push({
    type: 'lodging',
    time: minutesToTime(currentTime),
    title: `抵达「${endInfo.name}」住宿`,
    coordinates: endInfo.coordinates
  });

  const total = currentTime - dayStart;
  if (total > params.maxDurationMinutes) {
    return null;
  }

  return { events, drive: totalDrive, activity: totalActivity, total };
}

export const heuristicSchedule: ScheduleStrategyFn = (ctx): ScheduleResult => {
  const { attractions, params } = ctx;
  const selected = attractions.filter(a => a.selected);
  const unassigned: UnassignedAttraction[] = [];
  const dayPlans: DayPlan[] = [];
  const driveCache = new Map<string, number>();

  const sortedByPriority = [...selected].sort((a, b) => b.priority - a.priority);

  const remaining = new Map<string, Attraction>();
  sortedByPriority.forEach(a => remaining.set(a.id, a));

  for (let day = 1; day <= params.days; day++) {
    const startInfo = getStartForDay(params, day);
    const endInfo = getLodgingForDay(params, day);
    const candidates = Array.from(remaining.values());

    if (candidates.length === 0) break;

    const scored = candidates.map(attr => {
      const distStart = haversineDistance(startInfo.coordinates, attr.coordinates);
      const distEnd = haversineDistance(attr.coordinates, endInfo.coordinates);
      const crossCity =
        attr.city &&
        startInfo !== endInfo &&
        false
          ? CROSS_CITY_PENALTY
          : 0;
      const score = attr.priority * 20 - distStart * 2 - distEnd * 1 - crossCity;
      return { attr, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const pickedForDay: Attraction[] = [];
    const usedThisRound = new Set<string>();

    let dayBuilt: { events: TimelineEvent[]; drive: number; activity: number; total: number } | null = null;

    for (let attempt = 0; attempt < scored.length; attempt++) {
      const seed = scored[attempt].attr;
      if (usedThisRound.has(seed.id)) continue;

      const currentPicked: Attraction[] = [seed];
      const used = new Set<string>([seed.id]);

      for (let i = 0; i < scored.length; i++) {
        const candidate = scored[i].attr;
        if (used.has(candidate.id)) continue;

        let bestInsertPos = -1;
        let bestOrder: Attraction[] | null = null;
        let bestMetrics: any = null;

        for (let pos = 0; pos <= currentPicked.length; pos++) {
          const testOrder = [...currentPicked];
          testOrder.splice(pos, 0, candidate);

          let lastCoord = seed.coordinates;
          let totalDist = 0;
          for (let j = 1; j < testOrder.length; j++) {
            totalDist += haversineDistance(lastCoord, testOrder[j].coordinates);
            lastCoord = testOrder[j].coordinates;
          }

          if (candidate.city !== seed.city && currentPicked.some(p => p.city !== candidate.city)) {
            totalDist += CROSS_CITY_PENALTY;
          }

          const testBuild = buildDayEvents(day, testOrder, ctx, driveCache);
          if (!testBuild) continue;

          if (!bestMetrics || totalDist < bestMetrics.dist) {
            bestInsertPos = pos;
            bestOrder = testOrder;
            bestMetrics = { dist: totalDist, build: testBuild };
          }
        }

        if (bestOrder && bestMetrics) {
          for (let k = 0; k < currentPicked.length + 1; k++) {
            if (k === bestInsertPos) {
              currentPicked.splice(k, 0, candidate);
              used.add(candidate.id);
              break;
            }
          }
        }
      }

      const finalBuild = buildDayEvents(day, currentPicked, ctx, driveCache);
      if (!finalBuild) {
        if (currentPicked.length === 1) {
          usedThisRound.add(seed.id);
          const attr = seed;
          const dToStart = estimateDriveMinutes(startInfo.coordinates, attr.coordinates, params.roadCoefficient);
          const arr = timeToMinutes(params.dayStartTime) + dToStart;
          const closeMin = timeToMinutes(attr.closeTime);
          if (arr >= closeMin) {
            addUnassigned(unassigned, attr.id, 'closed_upon_arrival', `到达「${attr.name}」时（${minutesToTime(arr)}）已闭馆（${attr.closeTime}）`);
          } else {
            addUnassigned(unassigned, attr.id, 'time_insufficient', `仅「${attr.name}」一处游玩加往返已超过当天时长上限`);
          }
        }
        continue;
      }

      if (!dayBuilt || finalBuild.total > dayBuilt.total) {
        dayBuilt = finalBuild;
        pickedForDay.length = 0;
        pickedForDay.push(...currentPicked);
        currentPicked.forEach(a => usedThisRound.add(a.id));
      }
    }

    if (dayBuilt && pickedForDay.length > 0) {
      pickedForDay.forEach(a => remaining.delete(a.id));
      dayPlans.push({
        day,
        events: dayBuilt.events,
        totalDriveMinutes: dayBuilt.drive,
        totalActivityMinutes: dayBuilt.activity,
        totalMinutes: dayBuilt.total,
        startPoint: startInfo.coordinates,
        endPoint: endInfo.coordinates,
        startPointName: startInfo.name,
        endPointName: endInfo.name
      });
    } else {
      dayPlans.push({
        day,
        events: [
          {
            type: 'departure',
            time: params.dayStartTime,
            title: `从「${startInfo.name}」出发`,
            coordinates: startInfo.coordinates
          },
          {
            type: 'lodging',
            time: params.dayEndTime,
            title: `在「${endInfo.name}」休息`,
            coordinates: endInfo.coordinates
          }
        ],
        totalDriveMinutes: 0,
        totalActivityMinutes: 0,
        totalMinutes: 0,
        startPoint: startInfo.coordinates,
        endPoint: endInfo.coordinates,
        startPointName: startInfo.name,
        endPointName: endInfo.name
      });
    }
  }

  remaining.forEach(attr => {
    if (!unassigned.some(u => u.attractionId === attr.id)) {
      addUnassigned(unassigned, attr.id, 'priority_too_low', `优先级较低，${params.days}天内未能排进行程`);
    }
  });

  return {
    plan: {
      days: dayPlans,
      unassigned,
      generatedAt: Date.now()
    }
  };
};

export const greedyPrioritySchedule: ScheduleStrategyFn = (ctx): ScheduleResult => {
  const { attractions, params } = ctx;
  const selected = [...attractions.filter(a => a.selected)].sort((a, b) => b.priority - a.priority);
  const unassigned: UnassignedAttraction[] = [];
  const dayPlans: DayPlan[] = [];
  const driveCache = new Map<string, number>();
  const remaining = new Map<string, Attraction>();
  selected.forEach(a => remaining.set(a.id, a));

  for (let day = 1; day <= params.days; day++) {
    const startInfo = getStartForDay(params, day);
    const endInfo = getLodgingForDay(params, day);
    const pickedForDay: Attraction[] = [];
    let dayBuilt: any = null;
    const lastPicked: string[] = [];

    for (const attr of Array.from(remaining.values())) {
      const testOrder = [...pickedForDay, attr];
      const testBuild = buildDayEvents(day, testOrder, ctx, driveCache);
      if (testBuild) {
        pickedForDay.push(attr);
        dayBuilt = testBuild;
        lastPicked.push(attr.id);
      }
    }

    if (dayBuilt && pickedForDay.length > 0) {
      pickedForDay.forEach(a => remaining.delete(a.id));
      dayPlans.push({
        day,
        events: dayBuilt.events,
        totalDriveMinutes: dayBuilt.drive,
        totalActivityMinutes: dayBuilt.activity,
        totalMinutes: dayBuilt.total,
        startPoint: startInfo.coordinates,
        endPoint: endInfo.coordinates,
        startPointName: startInfo.name,
        endPointName: endInfo.name
      });
    } else {
      dayPlans.push({
        day,
        events: [
          { type: 'departure', time: params.dayStartTime, title: `从「${startInfo.name}」出发`, coordinates: startInfo.coordinates },
          { type: 'lodging', time: params.dayEndTime, title: `在「${endInfo.name}」休息`, coordinates: endInfo.coordinates }
        ],
        totalDriveMinutes: 0, totalActivityMinutes: 0, totalMinutes: 0,
        startPoint: startInfo.coordinates, endPoint: endInfo.coordinates,
        startPointName: startInfo.name, endPointName: endInfo.name
      });
    }
  }

  remaining.forEach(attr => {
    addUnassigned(unassigned, attr.id, 'time_insufficient', `「${attr.name}」未能在${params.days}天内排入`);
  });

  return { plan: { days: dayPlans, unassigned, generatedAt: Date.now() } };
};

export const nearestNeighborSchedule: ScheduleStrategyFn = (ctx): ScheduleResult => {
  const { attractions, params } = ctx;
  const selected = attractions.filter(a => a.selected);
  const unassigned: UnassignedAttraction[] = [];
  const dayPlans: DayPlan[] = [];
  const driveCache = new Map<string, number>();
  const remaining = new Map<string, Attraction>();
  selected.forEach(a => remaining.set(a.id, a));

  for (let day = 1; day <= params.days; day++) {
    const startInfo = getStartForDay(params, day);
    const endInfo = getLodgingForDay(params, day);
    const pickedForDay: Attraction[] = [];
    let dayBuilt: any = null;
    let currentCoord = startInfo.coordinates;
    let safetyCounter = 0;

    while (safetyCounter < 100 && remaining.size > 0) {
      safetyCounter++;
      const arr = Array.from(remaining.values());
      arr.sort((a, b) => haversineDistance(currentCoord, a.coordinates) - haversineDistance(currentCoord, b.coordinates));
      let advanced = false;
      for (const cand of arr) {
        const testOrder = [...pickedForDay, cand];
        const testBuild = buildDayEvents(day, testOrder, ctx, driveCache);
        if (testBuild) {
          pickedForDay.push(cand);
          dayBuilt = testBuild;
          currentCoord = cand.coordinates;
          remaining.delete(cand.id);
          advanced = true;
          break;
        }
      }
      if (!advanced) break;
    }

    if (dayBuilt && pickedForDay.length > 0) {
      dayPlans.push({
        day,
        events: dayBuilt.events,
        totalDriveMinutes: dayBuilt.drive,
        totalActivityMinutes: dayBuilt.activity,
        totalMinutes: dayBuilt.total,
        startPoint: startInfo.coordinates,
        endPoint: endInfo.coordinates,
        startPointName: startInfo.name,
        endPointName: endInfo.name
      });
    } else {
      dayPlans.push({
        day,
        events: [
          { type: 'departure', time: params.dayStartTime, title: `从「${startInfo.name}」出发`, coordinates: startInfo.coordinates },
          { type: 'lodging', time: params.dayEndTime, title: `在「${endInfo.name}」休息`, coordinates: endInfo.coordinates }
        ],
        totalDriveMinutes: 0, totalActivityMinutes: 0, totalMinutes: 0,
        startPoint: startInfo.coordinates, endPoint: endInfo.coordinates,
        startPointName: startInfo.name, endPointName: endInfo.name
      });
    }
  }

  remaining.forEach(attr => {
    addUnassigned(unassigned, attr.id, 'time_insufficient', `「${attr.name}」未能在${params.days}天内排入`);
  });

  return { plan: { days: dayPlans, unassigned, generatedAt: Date.now() } };
};

const strategies: Record<ScheduleStrategy, ScheduleStrategyFn> = {
  heuristic: heuristicSchedule,
  greedy_priority: greedyPrioritySchedule,
  nearest_neighbor: nearestNeighborSchedule
};

export function scheduleTrip(
  attractions: Attraction[],
  params: TripParams,
  strategy: ScheduleStrategy = 'heuristic'
): TripPlan {
  const fn = strategies[strategy] || heuristicSchedule;
  const ctx: ScheduleContext = { attractions, params };
  return fn(ctx).plan;
}
