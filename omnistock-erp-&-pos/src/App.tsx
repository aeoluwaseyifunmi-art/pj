import React, { useState, useEffect } from 'react';
import { dbStore, DatabaseState } from './db/databaseStore';
import { Header } from './components/layout/Header';
import { PosTerminal } from './components/pos/PosTerminal';
import { InventoryManager } from './components/inventory/InventoryManager';
import { WholesaleOrders } from './components/wholesale/WholesaleOrders';
import { PosReporting } from './components/reports/PosReporting';
import { DatabaseStudio } from './components/database/DatabaseStudio';
import { BarcodeScannerModal } from './components/scanner/BarcodeScannerModal';

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState>(() => dbStore.getState());
  const [currentTab, setCurrentTab] = useState<string>('pos');
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = dbStore.subscribe(() => {
      setDbState({ ...dbStore.getState() });
    });
    return unsubscribe;
  }, []);

  const handleResetData = () => {
    if (window.confirm('Reset database to initial enterprise demo dataset? All custom test transactions will be re-initialized.')) {
      dbStore.resetToFactory();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Bar Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenQuickSale={() => setCurrentTab('pos')}
        onOpenScanner={() => setShowScannerModal(true)}
        onResetData={handleResetData}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 overflow-x-hidden">
        {currentTab === 'pos' && (
          <PosTerminal
            dbState={dbState}
            onOpenScanner={() => setShowScannerModal(true)}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryManager dbState={dbState} />
        )}

        {currentTab === 'wholesale' && (
          <WholesaleOrders
            dbState={dbState}
            onNavigateToPos={() => setCurrentTab('pos')}
          />
        )}

        {currentTab === 'reporting' && (
          <PosReporting dbState={dbState} />
        )}

        {currentTab === 'database' && (
          <DatabaseStudio dbState={dbState} />
        )}
      </main>

      {/* Barcode Scanner Modal */}
      {showScannerModal && (
        <BarcodeScannerModal
          dbState={dbState}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
}
