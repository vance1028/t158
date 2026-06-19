import { useApp } from '../store/AppContext';
import { formatDuration } from '../utils/time';
import type { ScheduleStrategy } from '../types';

const STRATEGIES: { value: ScheduleStrategy; label: string; desc: string }[] = [
  { value: 'heuristic', label: '综合启发式', desc: '优先覆盖高优先级 + 少绕路 + 少跨片区' },
  { value: 'greedy_priority', label: '贪心按优先级', desc: '严格按优先级从高到低塞景点' },
  { value: 'nearest_neighbor', label: '最近邻优先', desc: '总走离当前位置最近的下一站' }
];

export default function TripParamsPanel() {
  const { tripParams, setTripParams, selectedStrategy, setStrategy, generatePlan, tripPlan } = useApp();

  const updateLodging = (day: number, field: 'name' | 'lat' | 'lng', value: string) => {
    const newLodgings = tripParams.lodgingPoints.map(l => {
      if (l.day !== day) return l;
      if (field === 'name') return { ...l, name: value };
      const num = parseFloat(value);
      if (isNaN(num)) return l;
      return { ...l, coordinates: { ...l.coordinates, [field]: num } };
    });
    setTripParams({ lodgingPoints: newLodgings });
  };

  const copyStartToAll = () => {
    const newLodgings = tripParams.lodgingPoints.map(l => ({
      ...l,
      name: tripParams.startPointName,
      coordinates: { ...tripParams.startPoint }
    }));
    setTripParams({ lodgingPoints: newLodgings });
  };

  return (
    <div className="panel params-panel">
      <div className="panel-header">
        <div className="panel-title">
          <h2>⚙️ 行程参数</h2>
        </div>
        <button className="btn btn-primary" onClick={generatePlan}>
          {tripPlan ? '🔄 重新排行程' : '✨ 自动排行程'}
        </button>
      </div>

      <div className="params-section">
        <h3 className="section-title">基础设置</h3>
        <div className="params-grid">
          <div className="param-row">
            <label>游玩天数</label>
            <div className="param-control">
              <input
                type="number"
                min="1"
                max="14"
                value={tripParams.days}
                onChange={e => setTripParams({ days: Math.max(1, Math.min(14, parseInt(e.target.value) || 1)) })}
              />
              <span className="param-suffix">天</span>
            </div>
          </div>
          <div className="param-row">
            <label>每天出发时间</label>
            <input
              type="time"
              value={tripParams.dayStartTime}
              onChange={e => setTripParams({ dayStartTime: e.target.value })}
            />
          </div>
          <div className="param-row">
            <label>每天回酒店时间</label>
            <input
              type="time"
              value={tripParams.dayEndTime}
              onChange={e => setTripParams({ dayEndTime: e.target.value })}
            />
          </div>
          <div className="param-row">
            <label>最长在外时长</label>
            <div className="param-control">
              <input
                type="number"
                min="60"
                max="720"
                step="30"
                value={tripParams.maxDurationMinutes}
                onChange={e => setTripParams({ maxDurationMinutes: parseInt(e.target.value) || 540 })}
              />
              <span className="param-suffix">分钟 ({formatDuration(tripParams.maxDurationMinutes)})</span>
            </div>
          </div>
          <div className="param-row">
            <label>道路系数</label>
            <div className="param-control">
              <input
                type="number"
                min="1"
                max="3"
                step="0.1"
                value={tripParams.roadCoefficient}
                onChange={e => setTripParams({ roadCoefficient: parseFloat(e.target.value) || 1.4 })}
              />
              <span className="param-suffix">直线距离×系数</span>
            </div>
          </div>
        </div>
      </div>

      <div className="params-section">
        <h3 className="section-title">出发点</h3>
        <div className="params-grid">
          <div className="param-row span-2">
            <label>名称</label>
            <input
              type="text"
              value={tripParams.startPointName}
              onChange={e => setTripParams({ startPointName: e.target.value })}
              placeholder="例：北京前门酒店"
            />
          </div>
          <div className="param-row">
            <label>纬度</label>
            <input
              type="number"
              step="0.0001"
              value={tripParams.startPoint.lat}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) setTripParams({ startPoint: { ...tripParams.startPoint, lat: v } });
              }}
            />
          </div>
          <div className="param-row">
            <label>经度</label>
            <input
              type="number"
              step="0.0001"
              value={tripParams.startPoint.lng}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) setTripParams({ startPoint: { ...tripParams.startPoint, lng: v } });
              }}
            />
          </div>
        </div>
      </div>

      <div className="params-section">
        <div className="section-title-row">
          <h3 className="section-title">每日住宿点</h3>
          <button className="btn btn-ghost btn-xs" onClick={copyStartToAll}>全部同出发点</button>
        </div>
        <div className="lodging-list">
          {tripParams.lodgingPoints.map(lp => (
            <div key={lp.day} className="lodging-item">
              <div className="lodging-day">第{lp.day}天</div>
              <div className="lodging-fields">
                <input
                  type="text"
                  className="lodging-name"
                  value={lp.name}
                  placeholder="住宿点名称"
                  onChange={e => updateLodging(lp.day, 'name', e.target.value)}
                />
                <div className="coord-inputs">
                  <input
                    type="number"
                    step="0.0001"
                    value={lp.coordinates.lat}
                    placeholder="lat"
                    onChange={e => updateLodging(lp.day, 'lat', e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={lp.coordinates.lng}
                    placeholder="lng"
                    onChange={e => updateLodging(lp.day, 'lng', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="params-section">
        <h3 className="section-title">排程策略</h3>
        <div className="strategy-list">
          {STRATEGIES.map(s => (
            <label key={s.value} className={`strategy-item ${selectedStrategy === s.value ? 'selected' : ''}`}>
              <input
                type="radio"
                name="strategy"
                value={s.value}
                checked={selectedStrategy === s.value}
                onChange={() => setStrategy(s.value)}
              />
              <div className="strategy-content">
                <div className="strategy-name">{s.label}</div>
                <div className="strategy-desc">{s.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
