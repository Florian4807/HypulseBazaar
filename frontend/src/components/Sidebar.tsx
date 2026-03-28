import './Sidebar.css';

type ViewType = 'items' | 'flips' | 'history';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems: { id: ViewType; label: string }[] = [
    { id: 'items', label: 'Items' },
    { id: 'flips', label: 'Flips' },
    { id: 'history', label: 'History' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">SkyBazaar</h1>
        <p className="sidebar-subtitle">Flip Finder</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
