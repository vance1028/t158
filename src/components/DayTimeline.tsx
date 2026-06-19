import type { TimelineEvent, DayPlan } from '../types';
import { formatDuration } from '../utils/time';

const EVENT_ICON: Record<TimelineEvent['type'], string> = {
  departure: '🚗',
  arrival: '📍',
  activity: '🎯',
  drive: '🛣️',
  lodging: '🏨'
};

interface Props {
  dayPlan: DayPlan;
}

export default function DayTimeline({ dayPlan }: Props) {
  const { events, day, totalDriveMinutes, totalActivityMinutes, totalMinutes, startPointName, endPointName } = dayPlan;
  const attractionsCount = events.filter(e => e.type === 'activity').length;

  return (
    <div className="timeline-card">
      <div className="timeline-header">
        <div className="day-badge">Day {day}</div>
        <div className="day-info">
          <div className="day-title">第 {day} 天</div>
          <div className="day-subtitle">{startPointName} → {endPointName}</div>
        </div>
        <div className="day-stats">
          <div className="stat">
            <span className="stat-icon">🎯</span>
            <span className="stat-value">{attractionsCount}</span>
            <span className="stat-label">景点</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🛣️</span>
            <span className="stat-value">{formatDuration(totalDriveMinutes)}</span>
            <span className="stat-label">车程</span>
          </div>
          <div className="stat">
            <span className="stat-icon">⏱️</span>
            <span className="stat-value">{formatDuration(totalMinutes)}</span>
            <span className="stat-label">总时长</span>
          </div>
        </div>
      </div>

      <div className="timeline">
        {events.map((event, idx) => (
          <div key={idx} className={`timeline-item event-${event.type}`}>
            <div className="timeline-node">
              <span className="node-icon">{EVENT_ICON[event.type]}</span>
              {idx < events.length - 1 && <div className="node-line" />}
            </div>
            <div className="timeline-content">
              <div className="event-time">{event.time}</div>
              <div className="event-title">{event.title}</div>
              {event.description && (
                <div className="event-desc">{event.description}</div>
              )}
            </div>
            {event.durationMinutes !== undefined && (
              <div className="timeline-duration">
                {formatDuration(event.durationMinutes)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
