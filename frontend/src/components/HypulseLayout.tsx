import { type ReactNode } from 'react';

export type ViewType = 'dashboard' | 'catalog' | 'opportunities' | 'detail';

interface HypulseLayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lastUpdated: Date | null;
  children: ReactNode;
}

const NAV_ITEMS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',      icon: 'dashboard' },
  { id: 'catalog',       label: 'Items',           icon: 'inventory_2' },
  { id: 'opportunities', label: 'Opportunities',   icon: 'trending_up' },
];

export default function HypulseLayout({
  currentView, onViewChange, searchQuery, onSearchChange, lastUpdated, children,
}: HypulseLayoutProps) {
  const isItemsActive = currentView === 'catalog' || currentView === 'detail';

  function navActive(id: ViewType) {
    if (id === 'catalog') return isItemsActive;
    return currentView === id;
  }

  return (
    <div className="dark min-h-screen bg-surface text-on-surface font-body">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-stone-950 flex flex-col py-8 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-primary font-black font-headline text-sm uppercase tracking-widest leading-tight">
            Hypulse
          </h1>
          <p className="text-stone-500 text-[10px] uppercase tracking-[0.2em] font-medium mt-0.5">
            Bazaar Tracker
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-2" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              aria-current={navActive(id) ? 'page' : undefined}
              className={[
                'w-full flex items-center px-4 py-3 font-headline text-sm uppercase tracking-widest',
                'transition-all duration-200 active:translate-x-0.5',
                navActive(id)
                  ? 'text-primary bg-stone-900/80 font-bold border-l-4 border-primary'
                  : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900 border-l-4 border-transparent',
              ].join(' ')}
            >
              <span className="material-symbols-outlined mr-3 text-lg" aria-hidden>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto">
          <div className="flex items-center px-4 py-2 text-stone-600 text-[10px] uppercase tracking-tighter">
            <span className="material-symbols-outlined text-[14px] mr-2 text-tertiary" aria-hidden>sensors</span>
            API Status: Online
          </div>
        </div>
      </aside>

      {/* ── Top Header ────────────────────────────────────── */}
      <header className="fixed top-0 right-0 left-64 bg-stone-900/70 backdrop-blur-xl h-16 flex items-center justify-between px-6 z-40 shadow-2xl shadow-black/40">
        <div className="flex items-center space-x-4">
          <span className="text-xl font-bold text-primary tracking-tighter font-headline">
            Hypulse Bazaar Tracker
          </span>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-primary transition-colors text-sm" aria-hidden>
              search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search items..."
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-stone-950/50 border border-stone-800 focus:border-primary text-xs py-2 pl-10 pr-4 placeholder:text-stone-600 font-label uppercase tracking-widest rounded-sm outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative">
            <span className="material-symbols-outlined text-stone-400 hover:text-primary transition-colors cursor-pointer" aria-label="Notifications">
              notifications
            </span>
          </div>
          <div className="w-8 h-8 rounded-sm bg-stone-800 border border-stone-700 flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-stone-400 text-sm" aria-hidden>person</span>
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="ml-64 mt-16 min-h-screen flex flex-col bg-surface-container-low">
        <div className="flex-1">
          {children}
        </div>

        {/* Footer */}
        <footer className="py-4 px-8 flex justify-between items-center border-t border-stone-800/20 bg-stone-950">
          <p className="text-[10px] uppercase tracking-tighter text-stone-600">
            {lastUpdated
              ? `Last Updated: ${lastUpdated.toLocaleTimeString()} | HypulseBazaar v1.0`
              : 'Hypulse Bazaar Tracker'}
          </p>
          <div className="flex space-x-6">
            <span className="text-[10px] uppercase tracking-tighter text-stone-600">Hypixel SkyBlock</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
