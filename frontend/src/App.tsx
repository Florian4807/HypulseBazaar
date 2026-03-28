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

  const handleItemSelect = (productId: string) => {
    setSelectedItem(productId)
    setCurrentView('history')
  }

  const handleFlipSelect = (productId: string) => {
    setSelectedItem(productId)
    setCurrentView('history')
  }

  const renderMainContent = () => {
    switch (currentView) {
      case 'items':
        return (
          <div className="items-view">
            <ItemsList onItemSelect={handleItemSelect} />
            {selectedItem && (
              <PriceChart productId={selectedItem} />
            )}
          </div>
        )
      case 'flips':
        return <TopFlips onFlipSelect={handleFlipSelect} />
      case 'history':
        return selectedItem ? (
          <PriceChart productId={selectedItem} />
        ) : (
          <div className="empty-state">Select an item to view price history</div>
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
