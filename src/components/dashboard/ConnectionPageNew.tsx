import React from 'react';
import { UnifiedDataConnectionManager } from '../ConnectionManager/UnifiedDataConnectionManager';

interface ConnectionPageProps {
  onBack?: () => void;
}

export function ConnectionPage({ onBack }: ConnectionPageProps) {
  return <UnifiedDataConnectionManager onBack={onBack} />;
}
