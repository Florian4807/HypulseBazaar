import './Sidebar.css';

type ViewType = 'items' | 'flips' | 'history';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

function IconItems() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconSpreads() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 12L5.5 8L8.5 10L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4H14V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5V8.5L10.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v8M8 7.5h3a1.5 1.5 0 010 3H9a1.5 1.5 0 000 3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const NAV_ITEMS: { id: ViewType; label: string; description: string; Icon: () => JSX.Element }[] = [
  { id: 'items', label: 'Market', description: 'Browse all items', Icon: IconItems },
  { id: 'flips', label: 'Spreads', description: 'Flip opportunities', Icon: IconSpreads },
  { id: 'history', label: 'History', description: 'Price charts', Icon: IconHistory },
];

function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden>
            <IconCoin />
          </div>
          <div className="sidebar-brand-text">
            <h1 className="sidebar-title">SkyBazaar</h1>
            <p className="sidebar-subtitle">Bazaar analytics</p>
          </div>
        </div>
      </div>

      <div className="sidebar-section-label">Navigation</div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, description, Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${currentView === id ? 'active' : ''}`}
            onClick={() => onViewChange(id)}
            aria-current={currentView === id ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Icon />
            </span>
            <span className="nav-text">
              <span className="nav-label">{label}</span>
              <span className="nav-description">{description}</span>
            </span>
            {currentView === id && <span className="nav-active-indicator" aria-hidden />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot" aria-hidden />
          <span className="status-text">Live · 30s refresh</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
