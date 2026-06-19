import { useMemo, useState } from 'react';
import type { TripPlan, Coordinates, TimelineEvent } from '../types';
import { useApp } from '../store/AppContext';

interface Props {
  plan: TripPlan;
}

interface ProjectedPoint {
  x: number;
  y: number;
  coord: Coordinates;
  label: string;
  type: 'attraction' | 'start' | 'lodging';
  day?: number;
  attractionId?: string;
}

const DAY_COLORS = [
  '#4f46e5', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#e11d48',
  '#a855f7', '#0ea5e9'
];

const WIDTH = 560;
const HEIGHT = 400;
const PADDING = 60;

export default function RouteMap({ plan }: Props) {
  const { attractions, getAttractionById } = useApp();
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const allPoints = useMemo<ProjectedPoint[]>(() => {
    const pts: ProjectedPoint[] = [];
    const seen = new Set<string>();
    const seenLabels = new Set<string>();

    plan.days.forEach(dp => {
      const startKey = `${dp.startPoint.lat},${dp.startPoint.lng}`;
      if (!seen.has(startKey + dp.startPointName)) {
        pts.push({
          x: 0, y: 0,
          coord: dp.startPoint,
          label: dp.startPointName,
          type: dp.day === 1 ? 'start' : 'lodging',
          day: dp.day
        });
        seen.add(startKey + dp.startPointName);
      }

      dp.events.forEach(e => {
        if (e.coordinates && e.attractionId) {
          const key = `${e.coordinates.lat},${e.coordinates.lng},${e.attractionId}`;
          if (!seen.has(key)) {
            const a = getAttractionById(e.attractionId);
            pts.push({
              x: 0, y: 0,
              coord: e.coordinates,
              label: a?.name || '景点',
              type: 'attraction',
              attractionId: e.attractionId,
              day: dp.day
            });
            seen.add(key);
          }
        }
      });

      const endKey = `${dp.endPoint.lat},${dp.endPoint.lng}`;
      if (!seen.has(endKey + dp.endPointName)) {
        pts.push({
          x: 0, y: 0,
          coord: dp.endPoint,
          label: dp.endPointName,
          type: 'lodging',
          day: dp.day
        });
        seen.add(endKey + dp.endPointName);
      }
    });

    attractions.filter(a => a.selected).forEach(a => {
      const key = `${a.coordinates.lat},${a.coordinates.lng},${a.id}`;
      if (!seen.has(key)) {
        pts.push({
          x: 0, y: 0,
          coord: a.coordinates,
          label: a.name,
          type: 'attraction',
          attractionId: a.id
        });
        seen.add(key);
      }
    });

    return pts;
  }, [plan, attractions, getAttractionById]);

  const projected = useMemo(() => {
    if (allPoints.length === 0) return [];
    const lats = allPoints.map(p => p.coord.lat);
    const lngs = allPoints.map(p => p.coord.lng);
    let minLat = Math.min(...lats), maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const pad = Math.max(latSpan, lngSpan) * 0.15 || 0.01;
    minLat -= pad; maxLat += pad; minLng -= pad; maxLng += pad;

    const rangeLat = maxLat - minLat || 1;
    const rangeLng = maxLng - minLng || 1;

    return allPoints.map(p => ({
      ...p,
      x: PADDING + ((p.coord.lng - minLng) / rangeLng) * (WIDTH - 2 * PADDING),
      y: HEIGHT - PADDING - ((p.coord.lat - minLat) / rangeLat) * (HEIGHT - 2 * PADDING)
    }));
  }, [allPoints]);

  const linesByDay = useMemo(() => {
    const result: Record<number, { from: ProjectedPoint; to: ProjectedPoint }[]> = {};
    plan.days.forEach(dp => {
      const list: { from: ProjectedPoint; to: ProjectedPoint }[] = [];
      const routeCoords: { coord: Coordinates; type: TimelineEvent['type']; attractionId?: string }[] = [];

      dp.events.forEach(e => {
        if (e.type === 'departure' || e.type === 'arrival' || e.type === 'activity' || e.type === 'lodging') {
          if (e.coordinates) {
            routeCoords.push({ coord: e.coordinates, type: e.type, attractionId: e.attractionId });
          }
        }
      });

      for (let i = 0; i < routeCoords.length - 1; i++) {
        const findP = (c: Coordinates, aid?: string) =>
          projected.find(p =>
            (aid && p.attractionId === aid) ||
            (Math.abs(p.coord.lat - c.lat) < 0.0001 && Math.abs(p.coord.lng - c.lng) < 0.0001)
          );
        const from = findP(routeCoords[i].coord, routeCoords[i].attractionId);
        const to = findP(routeCoords[i + 1].coord, routeCoords[i + 1].attractionId);
        if (from && to) list.push({ from, to });
      }
      result[dp.day] = list;
    });
    return result;
  }, [plan, projected]);

  const dayLegend = plan.days.map(dp => ({
    day: dp.day,
    count: dp.events.filter(e => e.type === 'activity').length
  }));

  return (
    <div className="route-map-card">
      <div className="map-header">
        <h3>🗺️ 路线示意图</h3>
        <div className="day-legend">
          {dayLegend.map(d => (
            <div
              key={d.day}
              className={`legend-item ${hoverDay === d.day ? 'hover' : ''}`}
              onMouseEnter={() => setHoverDay(d.day)}
              onMouseLeave={() => setHoverDay(null)}
            >
              <span className="legend-color" style={{ background: DAY_COLORS[(d.day - 1) % DAY_COLORS.length] }} />
              <span>Day{d.day} · {d.count}景点</span>
            </div>
          ))}
        </div>
      </div>
      <div className="map-svg-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="map-svg">
          <defs>
            {dayLegend.map(d => (
              <marker
                key={d.day}
                id={`arrow-${d.day}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={DAY_COLORS[(d.day - 1) % DAY_COLORS.length]} />
              </marker>
            ))}
          </defs>

          {Object.entries(linesByDay).flatMap(([dayStr, lines]) => {
            const day = parseInt(dayStr);
            const color = DAY_COLORS[(day - 1) % DAY_COLORS.length];
            const dim = hoverDay !== null && hoverDay !== day;
            return lines.map((ln, i) => {
              const mx = (ln.from.x + ln.to.x) / 2;
              const my = (ln.from.y + ln.to.y) / 2;
              const dx = ln.to.x - ln.from.x;
              const dy = ln.to.y - ln.from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const offset = 18;
              const cx = len > 0 ? mx - (dy / len) * offset : mx;
              const cy = len > 0 ? my + (dx / len) * offset : my;
              return (
                <g key={`${day}-${i}`} opacity={dim ? 0.15 : 1}>
                  <path
                    d={`M ${ln.from.x} ${ln.from.y} Q ${cx} ${cy} ${ln.to.x} ${ln.to.y}`}
                    stroke={color}
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={day % 2 === 0 ? '6 4' : undefined}
                    markerEnd={`url(#arrow-${day})`}
                  />
                </g>
              );
            });
          })}

          {projected.map((p, i) => {
            const color = p.type === 'attraction'
              ? (p.day ? DAY_COLORS[(p.day - 1) % DAY_COLORS.length] : '#64748b')
              : (p.type === 'start' ? '#059669' : '#0284c7');
            const dim = hoverDay !== null && p.day && p.day !== hoverDay && p.type === 'attraction';
            return (
              <g key={i} className="map-point" opacity={dim ? 0.2 : 1}>
                <circle cx={p.x} cy={p.y} r={p.type === 'attraction' ? 8 : 10} fill={color} stroke="white" strokeWidth="2" />
                {p.type === 'start' && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">S</text>}
                {p.type === 'lodging' && p.day !== undefined && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">H</text>}
                <rect
                  x={p.x + 12}
                  y={p.y - 10}
                  width={p.label.length * 13 + 12}
                  height="20"
                  rx="4"
                  fill="rgba(255,255,255,0.95)"
                  stroke={color}
                  strokeWidth="1"
                />
                <text x={p.x + 18} y={p.y + 4} fontSize="12" fill="#1e293b" fontWeight="500">
                  {p.label.length > 10 ? p.label.slice(0, 10) + '…' : p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="map-legend-row">
        <div className="mini-legend"><span className="dot" style={{ background: '#059669' }} />S 出发点</div>
        <div className="mini-legend"><span className="dot" style={{ background: '#0284c7' }} />H 住宿点</div>
        <div className="mini-legend"><span className="dot" style={{ background: '#64748b' }} />景点（未排入）</div>
      </div>
    </div>
  );
}
