import './Sidebar.css';

type ViewType = 'items' | 'flips' | 'history';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems: { id: ViewType; label: string }[] = [
    { id: 'items', label: 'Items' },
    { id: 'flips', label: 'Spreads' },
    { id: 'history', label: 'History' },
  ];

  const icons: Record<ViewType, string> = {
    items: '📦',
    flips: '⚡',
    history: '📈',
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden>
            ⛃
          </div>
          <div>
            <h1 className="sidebar-title">SkyBazaar</h1>
            <p className="sidebar-subtitle">Bazaar prices & flips</p>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Main">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon" aria-hidden>
              {icons[item.id]}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
