import { useState } from 'react';
import HypulseLayout, { type ViewType } from './components/HypulseLayout';
import Dashboard     from './components/Dashboard';
import ItemCatalog   from './components/ItemCatalog';
import Opportunities from './components/Opportunities';
import ItemDetail    from './components/ItemDetail';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  function handleItemSelect(productId: string) {
    setSelectedItem(productId);
    setCurrentView('detail');
  }

  function handleViewChange(view: ViewType) {
    setCurrentView(view);
    if (view !== 'detail') setSearchQuery('');
  }

  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            onItemSelect={handleItemSelect}
            onUpdated={setLastUpdated}
          />
        );
      case 'catalog':
        return (
          <ItemCatalog
            onItemSelect={handleItemSelect}
            searchQuery={searchQuery}
            onUpdated={setLastUpdated}
          />
        );
      case 'opportunities':
        return (
          <Opportunities
            onItemSelect={handleItemSelect}
            searchQuery={searchQuery}
            onUpdated={setLastUpdated}
          />
        );
      case 'detail':
        return selectedItem ? (
          <ItemDetail
            productId={selectedItem}
            onBack={() => setCurrentView('catalog')}
            onUpdated={setLastUpdated}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-stone-600">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl opacity-20 mb-4 block" aria-hidden>bar_chart</span>
              <p className="text-xs uppercase tracking-widest">Select an item to view its history</p>
            </div>
          </div>
        );
    }
  }

  return (
    <HypulseLayout
      currentView={currentView}
      onViewChange={handleViewChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      lastUpdated={lastUpdated}
    >
      {renderView()}
    </HypulseLayout>
  );
}
