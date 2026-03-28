import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ItemsList from './components/ItemsList'
import PriceChart from './components/PriceChart'
import TopFlips from './components/TopFlips'
import './App.css'

type ViewType = 'items' | 'flips' | 'history'

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('items')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  const handleItemSelect = (productId: string, _name?: string) => {
    setSelectedItem(productId)
    setCurrentView('history')
  }

  const handleFlipSelect = (productId: string, _name?: string) => {
    setSelectedItem(productId)
    setCurrentView('history')
  }

  const handleBackToItems = () => {
    setCurrentView('items')
  }

  const renderMainContent = () => {
    switch (currentView) {
      case 'items':
        return (
          <div className="items-view">
            <ItemsList onItemSelect={handleItemSelect} />
            {selectedItem ? (
              <PriceChart productId={selectedItem} />
            ) : (
              <div className="chart-placeholder">
                <div className="chart-placeholder-inner">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
                    <path d="M5 30L13 20L20 24L30 12L38 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="13" cy="20" r="2.5" fill="currentColor" opacity="0.5" />
                    <circle cx="20" cy="24" r="2.5" fill="currentColor" opacity="0.5" />
                    <circle cx="30" cy="12" r="2.5" fill="currentColor" opacity="0.5" />
                  </svg>
                  <p>Select an item from the list to view its price history</p>
                </div>
              </div>
            )}
          </div>
        )
      case 'flips':
        return <TopFlips onFlipSelect={handleFlipSelect} />
      case 'history':
        return selectedItem ? (
          <PriceChart productId={selectedItem} onBack={handleBackToItems} />
        ) : (
          <div className="chart-placeholder chart-placeholder--full">
            <div className="chart-placeholder-inner">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
                <path d="M5 30L13 20L20 24L30 12L38 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p>Go to <strong>Market</strong> or <strong>Spreads</strong> and click an item to view its history</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="main-content">
        {renderMainContent()}
      </main>
    </div>
  )
}

export default App
