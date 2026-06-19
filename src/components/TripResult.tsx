import { useRef } from 'react';
import { useApp, formatDuration } from '../store/AppContext';
import DayTimeline from './DayTimeline';
import RouteMap from './RouteMap';

const REASON_ICON: Record<string, string> = {
  time_insufficient: '⏳',
  closed_upon_arrival: '🔒',
  priority_too_low: '📊',
  cross_area_backtrack: '🔄'
};

export default function TripResult() {
  const { tripPlan, attractions, getAttractionById, formatUnassignedReason, exportData, importData, resetAll } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!tripPlan) {
    return (
      <div className="panel result-panel empty">
        <div className="empty-plan">
          <div className="empty-icon">🧭</div>
          <h3>还没有行程</h3>
          <p>在左侧设置好行程参数后，点击「自动排行程」按钮</p>
          <p className="empty-tips">系统会根据优先级、位置远近、开放时间帮你排出一份合理的行程</p>
        </div>
      </div>
    );
  }

  const totalAttractions = tripPlan.days.reduce(
    (s, d) => s + d.events.filter(e => e.type === 'activity').length, 0
  );
  const totalDrive = tripPlan.days.reduce((s, d) => s + d.totalDriveMinutes, 0);
  const selectedCount = attractions.filter(a => a.selected).length;

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const ok = importData(text);
      if (!ok) alert('导入失败：文件格式不正确');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="panel result-panel">
      <div className="panel-header">
        <div className="panel-title">
          <h2>📋 行程规划结果</h2>
          <span className="count-badge success">{totalAttractions}/{selectedCount} 景点已排入</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleImportClick}>📥 导入</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>📤 导出</button>
          <button
            className="btn btn-ghost btn-sm danger"
            onClick={() => { if (confirm('确定重置所有数据到默认状态吗？')) resetAll(); }}
          >↺ 重置</button>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>
      </div>

      <div className="result-summary">
        <div className="summary-item">
          <span className="s-label">游玩天数</span>
          <span className="s-value">{tripPlan.days.length} 天</span>
        </div>
        <div className="summary-item">
          <span className="s-label">景点总数</span>
          <span className="s-value">{totalAttractions} 个</span>
        </div>
        <div className="summary-item">
          <span className="s-label">累计车程</span>
          <span className="s-value">{formatDuration(totalDrive)}</span>
        </div>
        <div className="summary-item">
          <span className="s-label">生成时间</span>
          <span className="s-value">{new Date(tripPlan.generatedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {tripPlan.days.length > 0 && <RouteMap plan={tripPlan} />}

      <div className="timelines-wrap">
        {tripPlan.days.map(day => (
          <DayTimeline key={day.day} dayPlan={day} />
        ))}
      </div>

      {tripPlan.unassigned.length > 0 && (
        <div className="unassigned-section">
          <h3 className="section-title">⚠️ 未能排入的景点 ({tripPlan.unassigned.length})</h3>
          <div className="unassigned-list">
            {tripPlan.unassigned.map((u, i) => {
              const attr = getAttractionById(u.attractionId);
              return (
                <div key={i} className={`unassigned-item reason-${u.reason}`}>
                  <div className="u-icon">{REASON_ICON[u.reason] || '❓'}</div>
                  <div className="u-body">
                    <div className="u-name">{attr?.name || '未知景点'}</div>
                    <div className="u-reason">
                      <span className="reason-tag">{formatUnassignedReason(u.reason)}</span>
                      <span className="u-detail">{u.detail}</span>
                    </div>
                  </div>
                  {attr && (
                    <div className="u-meta">
                      优先级 <b>{attr.priority}</b> · {formatDuration(attr.durationMinutes)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
