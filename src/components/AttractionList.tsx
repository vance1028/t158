import { useState } from 'react';
import type { Attraction } from '../types';
import { useApp, formatDuration } from '../store/AppContext';
import AttractionForm from './AttractionForm';

export default function AttractionList() {
  const { attractions, toggleAttraction, deleteAttraction, updateAttraction, addAttraction, getAttractionById } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [search, setSearch] = useState('');

  const editing = editingId ? getAttractionById(editingId) || null : null;

  const filtered = attractions.filter(a => {
    if (filter === 'selected' && !a.selected) return false;
    if (filter === 'unselected' && a.selected) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return a.name.toLowerCase().includes(s) || a.city.toLowerCase().includes(s) || a.category.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: attractions.length,
    selected: attractions.filter(a => a.selected).length
  };

  return (
    <div className="panel attraction-panel">
      <div className="panel-header">
        <div className="panel-title">
          <h2>🗺️ 景点库</h2>
          <span className="count-badge">{stats.selected}/{stats.total}</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ 添加景点</button>
      </div>

      <div className="filter-row">
        <input
          type="text"
          className="search-input"
          placeholder="搜索景点名称 / 城市 / 类别..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全部</button>
          <button className={`tab ${filter === 'selected' ? 'active' : ''}`} onClick={() => setFilter('selected')}>已选</button>
          <button className={`tab ${filter === 'unselected' ? 'active' : ''}`} onClick={() => setFilter('unselected')}>未选</button>
        </div>
      </div>

      <div className="attraction-list">
        {filtered.length === 0 && (
          <div className="empty-state">暂无匹配的景点</div>
        )}
        {filtered.map(attr => (
          <div key={attr.id} className={`attraction-card ${attr.selected ? 'selected' : ''}`}>
            <div className="card-checkbox">
              <input
                type="checkbox"
                checked={attr.selected}
                onChange={() => toggleAttraction(attr.id)}
              />
            </div>
            <div className="card-body">
              <div className="card-top">
                <h4 className="card-name">{attr.name}</h4>
                <div className="priority-dots">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={`dot ${n <= attr.priority ? 'on' : ''}`} />
                  ))}
                </div>
              </div>
              <div className="card-meta">
                <span className="tag tag-city">📍 {attr.city || '未标注'}</span>
                <span className="tag tag-cat">🏷️ {attr.category}</span>
              </div>
              <div className="card-details">
                <span>🕐 {attr.openTime}-{attr.closeTime}</span>
                <span>⏱️ {formatDuration(attr.durationMinutes)}</span>
                <span>🎫 ¥{attr.ticketPrice}</span>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-icon" title="编辑" onClick={() => setEditingId(attr.id)}>✏️</button>
              <button
                className="btn-icon danger"
                title="删除"
                onClick={() => {
                  if (confirm(`确定删除「${attr.name}」吗？`)) deleteAttraction(attr.id);
                }}
              >🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <AttractionForm
          attraction={null}
          onClose={() => setShowAdd(false)}
          onSave={(data) => addAttraction(data as Omit<Attraction, 'id'>)}
        />
      )}
      {editing && (
        <AttractionForm
          attraction={editing}
          onClose={() => setEditingId(null)}
          onSave={(data) => updateAttraction(data as Attraction)}
        />
      )}
    </div>
  );
}
