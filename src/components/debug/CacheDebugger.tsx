import React, { useState, useEffect } from 'react';
import { clearAllCaches, getCacheStatus, Logger } from '../../utils/optimizations';

interface CacheDebuggerProps {
  isVisible?: boolean;
}

export function CacheDebugger({ isVisible = process.env.NODE_ENV === 'development' }: CacheDebuggerProps) {
  const [cacheStatus, setCacheStatus] = useState({ sessionCacheSize: 0, persistentCacheKeys: [] });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setCacheStatus(getCacheStatus());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleClearCaches = () => {
    clearAllCaches();
    setCacheStatus(getCacheStatus());
    Logger.success('All caches cleared via debug panel');
  };

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  return (
    <div 
      className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 text-white text-xs"
      style={{ fontFamily: 'monospace' }}
    >
      <div 
        className="p-2 cursor-pointer flex items-center justify-between bg-gray-700 rounded-t-lg"
        onClick={toggleExpanded}
      >
        <span>Cache Debug</span>
        <span className="text-gray-400">{isExpanded ? '−' : '+'}</span>
      </div>
      
      {isExpanded && (
        <div className="p-3 space-y-2">
          <div>
            <strong>Session Cache:</strong> {cacheStatus.sessionCacheSize} items
          </div>
          <div>
            <strong>Persistent Cache:</strong> {cacheStatus.persistentCacheKeys.length} keys
          </div>
          
          {cacheStatus.persistentCacheKeys.length > 0 && (
            <div>
              <strong>Keys:</strong>
              <ul className="text-gray-300 text-xs mt-1">
                {cacheStatus.persistentCacheKeys.map(key => (
                  <li key={key}>• {key.replace('bookgx_', '')}</li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={handleClearCaches}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Clear All Caches
          </button>
        </div>
      )}
    </div>
  );
}
