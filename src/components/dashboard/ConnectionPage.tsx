import React, { useState } from 'react';
import { ConnectionsManager } from '../ConnectionManager/ConnectionsManager';
import { DatabasesManager } from '../DatabaseManager/DatabasesManager';
import { TablesManager } from '../TableManager/TablesManager';
import { HeadersManager } from '../HeaderManager/HeadersManager';

// Type definitions
type CurrentView = 'connections' | 'databases' | 'tables' | 'headers';

export function ConnectionPage() {
  // Navigation state
  const [currentView, setCurrentView] = useState<CurrentView>('connections');
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'saudi' | 'egypt'>('saudi');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      {currentView === 'connections' && (
        <ConnectionsManager 
          setCurrentView={setCurrentView} 
          setSelectedConnection={setSelectedConnection}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
      {currentView === 'databases' && (
        <DatabasesManager 
          setCurrentView={setCurrentView} 
          selectedConnection={selectedConnection}
          setSelectedDatabase={setSelectedDatabase}
          activeTab={activeTab}
        />
      )}
      {currentView === 'tables' && (
        <TablesManager 
          setCurrentView={setCurrentView} 
          selectedConnection={selectedConnection}
          selectedDatabase={selectedDatabase}
          setSelectedTable={setSelectedTable}
          activeTab={activeTab}
        />
      )}
      {currentView === 'headers' && (
        <HeadersManager 
          setCurrentView={setCurrentView} 
          selectedConnection={selectedConnection}
          selectedDatabase={selectedDatabase}
          selectedTable={selectedTable}
          activeTab={activeTab}
        />
      )}
    </div>
  );
}
