import { useState, useEffect } from 'react';
import type { Attraction, Coordinates } from '../types';
import { useApp } from '../store/AppContext';

const CATEGORIES = ['历史文化', '园林景观', '自然风光', '现代建筑', '街区风情', '艺术创意', '主题乐园', '其他'];

interface Props {
  attraction?: Attraction | null;
  onClose: () => void;
  onSave: (data: Omit<Attraction, 'id'> | Attraction) => void;
}

export default function AttractionForm({ attraction, onClose, onSave }: Props) {
  const { updateAttraction, addAttraction } = useApp();
  const isEdit = !!attraction;

  const [form, setForm] = useState<Omit<Attraction, 'id'>>({
    name: '',
    coordinates: { lat: 39.9042, lng: 116.4074 },
    city: '',
    openTime: '09:00',
    closeTime: '17:00',
    durationMinutes: 120,
    ticketPrice: 0,
    priority: 3,
    category: '历史文化',
    selected: true
  });

  useEffect(() => {
    if (attraction) {
      const { id: _id, ...rest } = attraction;
      setForm(rest);
    }
  }, [attraction]);

  const update = (k: keyof Omit<Attraction, 'id'>, v: any) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const updateCoord = (k: keyof Coordinates, v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) return;
    setForm(prev => ({ ...prev, coordinates: { ...prev.coordinates, [k]: num } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (isEdit && attraction) {
      onSave({ ...form, id: attraction.id });
    } else {
      onSave(form);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? '编辑景点' : '添加景点'}</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row span-2">
            <label>景点名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="例：故宫博物院"
              required
            />
          </div>
          <div className="form-row span-2">
            <label>所在城市/片区</label>
            <input
              type="text"
              value={form.city}
              onChange={e => update('city', e.target.value)}
              placeholder="例：北京市东城区"
            />
          </div>
          <div className="form-row">
            <label>纬度 (lat)</label>
            <input
              type="number"
              step="0.0001"
              value={form.coordinates.lat}
              onChange={e => updateCoord('lat', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>经度 (lng)</label>
            <input
              type="number"
              step="0.0001"
              value={form.coordinates.lng}
              onChange={e => updateCoord('lng', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>开门时间</label>
            <input
              type="time"
              value={form.openTime}
              onChange={e => update('openTime', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>关门时间</label>
            <input
              type="time"
              value={form.closeTime}
              onChange={e => update('closeTime', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>建议游玩时长（分钟）</label>
            <input
              type="number"
              min="10"
              step="10"
              value={form.durationMinutes}
              onChange={e => update('durationMinutes', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-row">
            <label>门票价格（元）</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.ticketPrice}
              onChange={e => update('ticketPrice', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="form-row">
            <label>类别</label>
            <select
              value={form.category}
              onChange={e => update('category', e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>想去程度（1最低 ~ 5最高）</label>
            <div className="priority-input">
              {[1, 2, 3, 4, 5].map(n => (
                <label key={n} className={`star ${n <= form.priority ? 'on' : ''}`}>
                  <input
                    type="radio"
                    name="priority"
                    value={n}
                    checked={form.priority === n}
                    onChange={() => update('priority', n)}
                  />
                  {n}
                </label>
              ))}
            </div>
          </div>
          <div className="form-row span-2">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.selected}
                onChange={e => update('selected', e.target.checked)}
              />
              加入此次行程规划
            </label>
          </div>
          <div className="form-actions span-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">{isEdit ? '保存修改' : '添加景点'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
