import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Database, Table, Settings, Plus, Trash2, TestTube } from 'lucide-react';

// Import the existing manager components for now
import { ConnectionsManager } from '../ConnectionManager/ConnectionsManager';
import { DatabasesManager } from '../DatabaseManager/DatabasesManager';
import { TablesManager } from '../TableManager/TablesManager';
import { HeadersManager } from '../HeaderManager/HeadersManager';

// Consolidated types
export interface NavigationState {
  currentView: 'connections' | 'databases' | 'tables' | 'headers';
  selectedConnection: string;
  selectedDatabase: string;
  selectedTable: string;
  activeTab: 'saudi' | 'egypt';
}

interface Breadcrumb {
  label: string;
  view: NavigationState['currentView'];
  action: () => void;
}

interface UnifiedDataConnectionManagerProps {
  onBack?: () => void;
}

/**
 * Unified Data Connection Manager
 * Consolidates ConnectionsManager, DatabasesManager, TablesManager, and HeadersManager
 * into a single cohesive component with better state management and navigation
 */
export function UnifiedDataConnectionManager({ onBack }: UnifiedDataConnectionManagerProps) {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // Parse URL to determine current state
  const getNavigationStateFromURL = useCallback((): NavigationState => {
    const path = location.pathname;
    const search = location.search;
    console.log('📍 Current URL path:', path);
    console.log('📍 Current URL search:', search);
    console.log('📍 Full URL:', window.location.href);
    
    // Default state
    let state: NavigationState = {
      currentView: 'connections',
      selectedConnection: '',
      selectedDatabase: '',
      selectedTable: '',
      activeTab: 'saudi'
    };

    // Parse URL structure: /connections/:connectionId/:databaseId/:tableId
    const pathParts = path.split('/').filter(part => part !== '');
    console.log('🔍 URL path parts:', pathParts);
    
    if (pathParts[0] === 'connections') {
      if (pathParts.length === 1) {
        // /connections
        state.currentView = 'connections';
      } else if (pathParts.length >= 2) {
        // /connections/:connectionId or more
        state.selectedConnection = pathParts[1];
        state.currentView = 'databases';
        
        if (pathParts.length >= 3) {
          // /connections/:connectionId/:databaseId
          state.selectedDatabase = pathParts[2];
          state.currentView = 'tables';
          
          if (pathParts.length >= 4) {
            // /connections/:connectionId/:databaseId/:tableId
            state.selectedTable = pathParts[3];
            state.currentView = 'headers';
          }
        }
      }
    }

    // Get active tab from query params or default to saudi
    const urlParams = new URLSearchParams(location.search);
    const region = urlParams.get('region');
    if (region === 'saudi' || region === 'egypt') {
      state.activeTab = region;
    }

    console.log('🎯 Parsed navigation state:', state);
    return state;
  }, [location.pathname, location.search]);

  // Initialize state from URL
  const [navigationState, setNavigationState] = useState<NavigationState>(getNavigationStateFromURL);

  // Update state when URL changes
  useEffect(() => {
    console.log('🔄 URL changed, updating navigation state...');
    const newState = getNavigationStateFromURL();
    console.log('📋 Setting new navigation state:', newState);
    setNavigationState(newState);
  }, [getNavigationStateFromURL]);

  // Debug current view rendering
  useEffect(() => {
    console.log('🎭 Current view being rendered:', navigationState.currentView);
    console.log('🔗 Current navigation state:', navigationState);
  }, [navigationState]);

  // Helper function to build URL
  const buildURL = useCallback((state: Partial<NavigationState>) => {
    const { selectedConnection, selectedDatabase, selectedTable, activeTab } = {
      ...navigationState,
      ...state
    };

    console.log('🔧 buildURL input state:', state);
    console.log('🔧 buildURL merged state:', { selectedConnection, selectedDatabase, selectedTable, activeTab });

    let url = '/connections';
    const params = new URLSearchParams();

    if (selectedConnection) {
      url += `/${selectedConnection}`;
      if (selectedDatabase) {
        url += `/${selectedDatabase}`;
        if (selectedTable) {
          url += `/${selectedTable}`;
        }
      }
    }

    if (activeTab !== 'saudi') {
      params.set('region', activeTab);
    }

    const queryString = params.toString();
    const finalURL = queryString ? `${url}?${queryString}` : url;
    console.log('🔧 buildURL result:', finalURL);
    return finalURL;
  }, [navigationState]);

  // Memoized breadcrumb navigation
  const breadcrumbs = useMemo<Breadcrumb[]>(() => {
    console.log('🍞 Building breadcrumbs for state:', navigationState);
    const crumbs: Breadcrumb[] = [
      {
        label: 'Connections',
        view: 'connections',
        action: () => {
          console.log('🍞 Breadcrumb: Navigating to connections');
          navigate(buildURL({ selectedConnection: '', selectedDatabase: '', selectedTable: '' }));
        }
      }
    ];

    if (navigationState.selectedConnection) {
      crumbs.push({
        label: 'Databases',
        view: 'databases',
        action: () => {
          console.log('🍞 Breadcrumb: Navigating to databases');
          navigate(buildURL({ selectedDatabase: '', selectedTable: '' }));
        }
      });
    }

    if (navigationState.selectedDatabase) {
      crumbs.push({
        label: 'Tables',
        view: 'tables',
        action: () => {
          console.log('🍞 Breadcrumb: Navigating to tables');
          navigate(buildURL({ selectedTable: '' }));
        }
      });
    }

    if (navigationState.selectedTable) {
      crumbs.push({
        label: 'Headers',
        view: 'headers',
        action: () => {
          console.log('🍞 Breadcrumb: Navigating to headers');
        }
      });
    }

    console.log('🍞 Generated breadcrumbs:', crumbs.map(c => c.label));
    return crumbs;
  }, [navigationState, navigate, buildURL]);

  // Navigation callbacks
  const handleSetCurrentView = useCallback((view: NavigationState['currentView']) => {
    console.log('🎯 handleSetCurrentView called with:', view);
    // Navigate to the appropriate URL based on view
    switch (view) {
      case 'connections':
        console.log('🎯 Navigating to connections view');
        navigate(buildURL({ selectedConnection: '', selectedDatabase: '', selectedTable: '' }));
        break;
      case 'databases':
        console.log('🎯 Navigating to databases view');
        navigate(buildURL({ selectedDatabase: '', selectedTable: '' }));
        break;
      case 'tables':
        console.log('🎯 Navigating to tables view');
        navigate(buildURL({ selectedTable: '' }));
        break;
      case 'headers':
        console.log('🎯 Navigating to headers view');
        // Headers view is automatically reached when table is selected
        break;
    }
  }, [navigate, buildURL]);

  const handleSetSelectedConnection = useCallback((connection: string) => {
    navigate(buildURL({ selectedConnection: connection, selectedDatabase: '', selectedTable: '' }));
  }, [navigate, buildURL]);

  const handleSetSelectedDatabase = useCallback((database: string) => {
    console.log('🚀 handleSetSelectedDatabase called with:', database);
    console.log('🔍 Current navigationState:', navigationState);
    const stateToUpdate = { selectedDatabase: database, selectedTable: '' };
    console.log('🔄 State to update:', stateToUpdate);
    const newURL = buildURL(stateToUpdate);
    console.log('🌐 Navigating to URL:', newURL);
    navigate(newURL);
    console.log('✅ Navigation called, waiting for URL change...');
  }, [navigate, buildURL, navigationState]);

  const handleSetSelectedTable = useCallback((table: string) => {
    navigate(buildURL({ selectedTable: table }));
  }, [navigate, buildURL]);

  const handleSetActiveTab = useCallback((tab: 'saudi' | 'egypt') => {
    navigate(buildURL({ activeTab: tab, selectedConnection: '', selectedDatabase: '', selectedTable: '' }));
  }, [navigate, buildURL]);

  // View icons mapping
  const viewIcons = {
    connections: Settings,
    databases: Database,
    tables: Table,
    headers: Settings
  };

  const CurrentIcon = viewIcons[navigationState.currentView];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Unified Header */}
      <div className="sticky top-10 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Empty space for layout balance */}
            <div></div>

            {/* Region Tabs - only show on connections page */}
            {navigationState.currentView === 'connections' && (
              <div className="flex rounded-lg bg-muted p-1">
                {(['saudi', 'egypt'] as const).map((region) => (
                  <button
                    key={region}
                    onClick={() => handleSetActiveTab(region)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      navigationState.activeTab === region
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {region === 'saudi' ? '🇸🇦 Saudi Arabia' : '🇪🇬 Egypt'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Breadcrumb Navigation with Action Buttons */}
          {breadcrumbs.length > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.view} className="flex items-center space-x-2">
                    {index > 0 && <span>/</span>}
                    <button
                      onClick={crumb.action}
                      className={`hover:text-foreground transition-colors ${
                        index === breadcrumbs.length - 1 
                          ? 'text-foreground font-medium' 
                          : 'text-muted-foreground'
                      }`}
                      disabled={index === breadcrumbs.length - 1}
                    >
                      {crumb.label}
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Action buttons placeholder - will be filled by child components */}
              <div id="action-buttons-container" className="flex items-center space-x-2">
                {/* Child components can render buttons here */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Connections View */}
        {navigationState.currentView === 'connections' && (
          <ConnectionsManager 
            setCurrentView={handleSetCurrentView}
            setSelectedConnection={handleSetSelectedConnection}
            activeTab={navigationState.activeTab}
            setActiveTab={handleSetActiveTab}
          />
        )}

        {/* Databases View */}
        {navigationState.currentView === 'databases' && (
          <DatabasesManager 
            setCurrentView={handleSetCurrentView}
            selectedConnection={navigationState.selectedConnection}
            setSelectedDatabase={handleSetSelectedDatabase}
          />
        )}

        {/* Tables View */}
        {navigationState.currentView === 'tables' && (
          <TablesManager 
            setCurrentView={handleSetCurrentView}
            selectedConnection={navigationState.selectedConnection}
            selectedDatabase={navigationState.selectedDatabase}
            setSelectedTable={handleSetSelectedTable}
          />
        )}

        {/* Headers View */}
        {navigationState.currentView === 'headers' && (
          <HeadersManager 
            setCurrentView={handleSetCurrentView}
            selectedConnection={navigationState.selectedConnection}
            selectedDatabase={navigationState.selectedDatabase}
            selectedTable={navigationState.selectedTable}
          />
        )}
      </div>
    </div>
  );
}

