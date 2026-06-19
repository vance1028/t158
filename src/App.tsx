import { useState } from 'react';
import AttractionList from './components/AttractionList';
import TripParamsPanel from './components/TripParamsPanel';
import TripResult from './components/TripResult';

type LeftTab = 'attractions' | 'params';

export default function App() {
  const [leftTab, setLeftTab] = useState<LeftTab>('params');

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">🚗</span>
          <div>
            <h1>自驾游行程规划器</h1>
            <p>纯本地 · 离线运行 · 自动排程</p>
          </div>
        </div>
        <div className="header-info">
          <span className="info-chip">💾 数据自动保存在浏览器</span>
        </div>
      </header>

      <main className="app-main">
        <aside className="left-pane">
          <div className="pane-tabs">
            <button
              className={`pane-tab ${leftTab === 'params' ? 'active' : ''}`}
              onClick={() => setLeftTab('params')}
            >
              ⚙️ 行程设置
            </button>
            <button
              className={`pane-tab ${leftTab === 'attractions' ? 'active' : ''}`}
              onClick={() => setLeftTab('attractions')}
            >
              🗺️ 景点库
            </button>
          </div>
          <div className="pane-content">
            {leftTab === 'params' && <TripParamsPanel />}
            {leftTab === 'attractions' && <AttractionList />}
          </div>
        </aside>

        <section className="right-pane">
          <TripResult />
        </section>
      </main>

      <footer className="app-footer">
        <span>景点间车程 = 坐标直线距离 × 道路系数（可调整），不连真实地图</span>
      </footer>
    </div>
  );
}
