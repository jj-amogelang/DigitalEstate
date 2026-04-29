/**
 * useFirstTimeVisit.js
 * ─────────────────────
 * Detects if this is a first-time user and manages the first-visit state.
 * 
 * Returns:
 *   {
 *     isFirstTime: bool,
 *     markVisited: () => void,
 *     resetFirstTime: () => void  // for testing
 *   }
 */

const FIRST_TIME_KEY = 'digitalEstate_visited_after_onboarding';

export default function useFirstTimeVisit() {
  const isFirstTime = typeof window !== 'undefined' 
    ? !localStorage.getItem(FIRST_TIME_KEY)
    : false;

  const markVisited = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FIRST_TIME_KEY, 'true');
    }
  };

  const resetFirstTime = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FIRST_TIME_KEY);
    }
  };

  return {
    isFirstTime,
    markVisited,
    resetFirstTime,
  };
}
