/**
 * FirstTimeHeroPage.jsx
 * ─────────────────────
 * Wrapper page that shows FirstTimeHero, then transitions to CoG modal
 * with auto-selected defaults on first visit.
 * 
 * After user interacts, marks first visit as complete and shows ExploreArea.
 */

import React, { useState } from 'react';
import FirstTimeHero from '../components/FirstTimeHero';
import ExplorePage from './ExplorePage';
import useFirstTimeVisit from '../hooks/useFirstTimeVisit';

export default function FirstTimeHeroPage() {
  const { isFirstTime, markVisited } = useFirstTimeVisit();
  const [cogOpen, setCogOpen] = useState(false);
  const [cogConfig, setCogConfig] = useState(null);

  const handleAnalyze = (areaId, areaName) => {
    // Store config for ExplorePage to use
    setCogConfig({
      areaId,
      areaName,
      isFirstTimeOpen: true,
    });
    // Open CoG modal in ExplorePage
    setCogOpen(true);
    // Mark first visit complete
    markVisited();
  };

  if (!isFirstTime) {
    // Not first time, show normal explore page
    return <ExplorePage />;
  }

  // First time: show hero or transition to CoG
  if (cogOpen && cogConfig) {
    // Transition to explore page with CoG modal already open
    return (
      <ExplorePage 
        cogInitiallyOpen={cogConfig.areaId}
        cogAreaName={cogConfig.areaName}
        isFirstTimeCoG={cogConfig.isFirstTimeOpen}
      />
    );
  }

  // Show hero
  return <FirstTimeHero onAnalyze={handleAnalyze} />;
}
