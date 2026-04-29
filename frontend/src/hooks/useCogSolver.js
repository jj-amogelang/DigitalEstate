/**
 * useCogSolver.js
 * ----------------
 * Custom hook that owns all Centre-of-Gravity solver state and API logic.
 *
 * Two-speed architecture
 * ----------------------
 *  PREVIEW  — POST /api/cog/preview
 *             5-iteration shallow solve, cache-backed, no ellipse.
 *             Fires on every slider drag event (80 ms debounce).
 *             Updates `previewResult` → live marker + heatmap on the map.
 *
 *  FULL     — POST /api/cog/solve
 *             Full 200-iteration solve with confidence ellipse.
 *             Fires only when:
 *               a) the user clicks the "Solve" button  (explicit)
 *               b) the user releases a slider thumb  (onDragEnd)
 *               c) the modal first opens / area changes  (initial load)
 *             Updates `result` → diagnostics panel + final ellipse.
 *
 * Consumer reads
 * --------------
 *   cog.result          Full solve result (lat, lng, uncertainty, convergence, …)
 *   cog.previewResult   Shallow result    (lat, lng, potential, parcels)
 *   cog.displayResult   previewResult ?? result  (convenience)
 *   cog.isDragging      true while any weight slider is being dragged
 *   cog.loading         true while full solve is in flight
 *   cog.previewLoading  true while preview is in flight
 *   cog.solve()         explicit full solve trigger
 *   cog.onDragStart()   call from slider onPointerDown
 *   cog.onDragMove(f,v) call from slider onInput (fires during drag)
 *   cog.onDragEnd(f,v)  call from slider onPointerUp / onBlur
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import areaDataService from '../services/areaDataService';

// ── Scenario presets ───────────────────────────────────────────────────────
export const SCENARIOS = {
  balanced:               { rentalYield: 25, pricePerSqm: 25, vacancy: 20, transitProximity: 15, footfall: 15 },
  valueInvestor:          { rentalYield: 40, pricePerSqm: 35, vacancy: 15, transitProximity:  5, footfall:  5 },
  transitFocused:         { rentalYield: 20, pricePerSqm: 15, vacancy: 15, transitProximity: 40, footfall: 10 },
  highFootfall:           { rentalYield: 15, pricePerSqm: 15, vacancy: 10, transitProximity: 20, footfall: 40 },
  developmentOpportunity: { rentalYield: 15, pricePerSqm: 20, vacancy: 20, transitProximity: 15, footfall: 30 },
  highYieldHunter:        { rentalYield: 55, pricePerSqm: 20, vacancy: 15, transitProximity:  5, footfall:  5 },
  airbnbShortStay:        { rentalYield: 25, pricePerSqm: 10, vacancy: 25, transitProximity: 20, footfall: 20 },
};

export const FACTOR_LABELS = {
  rentalYield:      'Rental Yield',
  pricePerSqm:      'Price / m²',
  vacancy:          'Vacancy Rate',
  transitProximity: 'Transit Access',
  footfall:         'Footfall',
};

export const ALL_ZONINGS = ['residential', 'commercial', 'mixed', 'industrial', 'retail'];

const PREVIEW_DEBOUNCE_MS = 80;    // fast — fires during drag
const SOLVE_DELAY_MS      = 150;   // short pause after drag ends before full solve

// ── Structured error code → user-friendly message ────────────────────────
const ERROR_MESSAGES = {
  INSUFFICIENT_PARCELS:    (d) => `Not enough parcels in this area (${d?.parcel_count ?? 0}). The solver needs at least ${d?.minimum ?? 3}.`,
  ALL_ZONING_FILTERED:     ()  => 'All parcels are excluded by the current zoning filter. Enable at least one zoning category.',
  INVALID_WEIGHTS:         ()  => 'Weight configuration is invalid. Please ensure weights are positive and sum to 100.',
  AREA_NOT_FOUND:          ()  => 'Area not found. Please select a valid area.',
  SOLVER_NUMERICAL_ERROR:  ()  => 'Parcels are too clustered for the solver to converge. Try a different area or zoning mix.',
  SOLVER_FAILED:           ()  => 'The solver encountered an unexpected error. Please try again.',
};

/**
 * Extract a user-facing error string from a (possibly structured) API response.
 * Falls back to `data.error` or a generic message if no code is present.
 */
function _extractError(data) {
  const fn = ERROR_MESSAGES[data?.code];
  if (fn) return fn(data?.details);
  return data?.error || 'Solver error';
}

// ── Hook ───────────────────────────────────────────────────────────────────
/**
 * @param {number|string} areaId      – the area to solve for
 * @param {boolean}        isActive    – true when the modal/panel is visible
 *                                       (gates the full solve)
 * @param {boolean}        previewActive – true when a quick preview should
 *                                        fire even if the modal is closed.
 *                                        Defaults to isActive. Pass !!areaId
 *                                        from the parent to warm the cache
 *                                        the moment an area is selected.
 */
export function useCogSolver({ areaId, isActive = true, previewActive = isActive }) {
  // ── Weights & scenario ─────────────────────────────────────────────────
  const [weights, setWeights]   = useState(SCENARIOS.balanced);
  const [scenario, setScenario] = useState('balanced');

  // ── Zoning constraints ─────────────────────────────────────────────────
  const [zoning, setZoning] = useState(['residential']);

  // ── Full solve state ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  // ── Preview state ──────────────────────────────────────────────────────
  const [previewResult,  setPreviewResult]  = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isDragging,     setIsDragging]     = useState(false);

  // ── Internal refs ──────────────────────────────────────────────────────
  const solveAbortRef   = useRef(null);   // AbortController for /cog/solve
  const previewAbortRef = useRef(null);   // AbortController for /cog/preview
  const previewDebounce = useRef(null);
  const solveAfterDrag  = useRef(null);   // delayed full-solve after drag end

  // ── Derived ────────────────────────────────────────────────────────────
  const totalWeight  = Object.values(weights).reduce((s, v) => s + v, 0);
  const weightsValid = totalWeight === 100;

  /** What the map should show: live preview during drag, full result otherwise. */
  const displayResult = isDragging || previewResult ? previewResult ?? result : result;

  // ── Helpers ────────────────────────────────────────────────────────────

  function _buildBody(w, z) {
    return {
      area_id:     areaId,
      weights:     w,
      constraints: { zoning_allow: z },
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────

  const setWeight = useCallback((factor, value) => {
    setWeights(prev => ({ ...prev, [factor]: parseInt(value, 10) }));
    setScenario('custom');
  }, []);

  const autoBalance = useCallback((changedFactor, changedValue) => {
    const val = parseInt(changedValue, 10);
    const others = Object.keys(weights).filter(k => k !== changedFactor);
    const remaining = Math.max(0, 100 - val);
    const each = Math.floor(remaining / others.length);
    const leftover = remaining - each * others.length;
    setWeights(prev => {
      const next = { ...prev, [changedFactor]: val };
      others.forEach((k, i) => { next[k] = each + (i === 0 ? leftover : 0); });
      return next;
    });
    setScenario('custom');
  }, [weights]);

  const applyScenario = useCallback((key) => {
    setScenario(key);
    setWeights(SCENARIOS[key]);
  }, []);

  const toggleZoning = useCallback((z) => {
    setZoning(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);
  }, []);

  const setAllZoning   = useCallback(() => setZoning([...ALL_ZONINGS]), []);
  const clearAllZoning = useCallback(() => setZoning([]), []);
  const resetZoning    = useCallback(() => setZoning(['residential']), []);

  // ── Preview API call ───────────────────────────────────────────────────

  const preview = useCallback(async (w, z) => {
    if (!areaId) return;
    const total = Object.values(w).reduce((s, v) => s + v, 0);
    if (total === 0) return;

    // Cancel previous preview
    if (previewAbortRef.current) previewAbortRef.current.abort();
    previewAbortRef.current = new AbortController();

    setPreviewLoading(true);
    try {
      await areaDataService.ready;
      const base = areaDataService.getApiBase();
      const resp = await fetch(`${base}/api/cog/preview`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  previewAbortRef.current.signal,
        body:    JSON.stringify(_buildBody(w, z)),
      });
      const data = await resp.json();
      if (data.success) {
        setPreviewResult(data);
      } else {
        // Surface non-fatal preview errors as the preview result error
        // (we don't show an error banner for preview, just stop the indicator)
        console.warn('[CoG preview]', data.code, data.error);
      }
    } catch (err) {
      // AbortError is expected on rapid successive drags — ignore silently
    } finally {
      setPreviewLoading(false);
    }
  }, [areaId]);  // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Apply a named profile and immediately kick off a fast preview so the
   * map responds before the full solve finishes.
   * Defined here (after `preview`) to avoid the temporal dead zone.
   */
  const applyProfile = useCallback((key) => {
    if (!SCENARIOS[key]) return;
    const w = SCENARIOS[key];
    setScenario(key);
    setWeights(w);
    preview(w, zoning);
  }, [zoning, preview]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Full solve API call ────────────────────────────────────────────────

  const solve = useCallback(async (w = weights) => {
    if (!areaId || !weightsValid) return;

    if (solveAbortRef.current) solveAbortRef.current.abort();
    solveAbortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      await areaDataService.ready;
      const base = areaDataService.getApiBase();
      const resp = await fetch(`${base}/api/cog/solve`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  solveAbortRef.current.signal,
        body:    JSON.stringify({
          ..._buildBody(w, zoning),
          solver: { max_iter: 200, tolerance: 5e-6, alpha0: 5e-4, damp_beta: 3e6 },
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(_extractError(data));
      setResult(data);
      setPreviewResult(null);  // full result supersedes preview
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [areaId, weightsValid, zoning, weights]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag lifecycle ─────────────────────────────────────────────────────

  /** Call from slider onPointerDown. */
  const onDragStart = useCallback(() => {
    setIsDragging(true);
    // Cancel any pending full solve so it doesn't fire mid-drag
    clearTimeout(solveAfterDrag.current);
    if (solveAbortRef.current) solveAbortRef.current.abort();
  }, []);

  /**
   * Call from slider onInput (fires continuously during drag).
   * Updates the weight state and fires a debounced preview.
   */
  const onDragMove = useCallback((factor, value) => {
    const w = { ...weights, [factor]: parseInt(value, 10) };
    setWeights(w);
    setScenario('custom');

    clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(() => {
      preview(w, zoning);
    }, PREVIEW_DEBOUNCE_MS);
  }, [weights, zoning, preview]);

  /**
   * Call from slider onPointerUp / onBlur.
   * Commits the final weight value and schedules a full solve.
   */
  const onDragEnd = useCallback((factor, value) => {
    const finalVal = parseInt(value, 10);
    const w = { ...weights, [factor]: finalVal };
    setWeights(w);
    setScenario('custom');
    setIsDragging(false);

    // Cancel debounced preview — full solve is coming
    clearTimeout(previewDebounce.current);

    // Small delay so the thumb snaps to its final position in the DOM first
    clearTimeout(solveAfterDrag.current);
    solveAfterDrag.current = setTimeout(() => solve(w), SOLVE_DELAY_MS);
  }, [weights, solve]);

  // ── Auto-solve when zoning changes (not during drag) ──────────────────
  const zoningRef = useRef(zoning);
  useEffect(() => { zoningRef.current = zoning; }, [zoning]);

  useEffect(() => {
    if (!isActive || isDragging) return;
    clearTimeout(solveAfterDrag.current);
    solveAfterDrag.current = setTimeout(() => {
      if (weightsValid) solve(weights);
    }, 400);
    return () => clearTimeout(solveAfterDrag.current);
  }, [zoning]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-solve on scenario preset change (instant weight commit, not a drag)
  const prevScenario = useRef(scenario);
  useEffect(() => {
    if (scenario !== 'custom' && scenario !== prevScenario.current) {
      prevScenario.current = scenario;
      if (isActive && weightsValid) solve(weights);
    }
  }, [scenario]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Area change: reset state + fire immediate preview ──────────────────
  //
  //  Fires whenever areaId changes (or previewActive first becomes true).
  //  Clears stale results and kicks off /cog/preview so that:
  //    a) the cache is warmed on the backend even before the modal opens, AND
  //    b) displayResult is populated the moment the modal renders, giving the
  //       user an animated marker + heatmap before the full solve finishes.
  //
  useEffect(() => {
    if (!areaId || !previewActive) return;
    // Reset all solver state for the new area
    setResult(null);
    setPreviewResult(null);
    setError(null);
    setIsDragging(false);
    // Warm preview — uses default balanced weights + residential zoning
    const defaultZoning = ['residential'];
    setZoning(defaultZoning);
    preview(weights, defaultZoning);
  }, [areaId, previewActive]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modal open (isActive): schedule full solve ─────────────────────────
  //
  //  Fires when the modal becomes visible (isActive false→true) or when the
  //  area changes while the modal is already open.  The preview result is
  //  already showing on the map; the full solve runs in the background and
  //  replaces it with the confidence ellipse + diagnostics.
  //
  useEffect(() => {
    if (!isActive || !areaId) return;
    clearTimeout(solveAfterDrag.current);
    solveAfterDrag.current = setTimeout(() => {
      if (weightsValid) solve(weights);
    }, SOLVE_DELAY_MS);
  }, [isActive, areaId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(previewDebounce.current);
    clearTimeout(solveAfterDrag.current);
    if (solveAbortRef.current)   solveAbortRef.current.abort();
    if (previewAbortRef.current) previewAbortRef.current.abort();
  }, []);

  return {
    // Weights
    weights,
    setWeight,
    autoBalance,
    totalWeight,
    weightsValid,
    // Scenario
    scenario,
    applyScenario,
    applyProfile,
    // Zoning
    zoning,
    toggleZoning,
    setAllZoning,
    clearAllZoning,
    resetZoning,
    // Full solve
    loading,
    error,
    result,
    solve,
    // Preview
    previewResult,
    previewLoading,
    isDragging,
    preview,
    // Drag lifecycle handlers (wire to slider events)
    onDragStart,
    onDragMove,
    onDragEnd,
    // Convenience: what the map should currently display
    displayResult,
  };
}
