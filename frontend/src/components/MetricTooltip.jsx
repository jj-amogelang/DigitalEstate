import React, { useState, useRef, useEffect } from 'react';
import './styles/metric-tooltip.css';

export default function MetricTooltip({ label, definition, delay = 450, children }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <span className="metric-tooltip-wrapper" onMouseEnter={show} onMouseLeave={hide} ref={ref}>
      {children || <span className="metric-label">{label}</span>}
      {visible && (
        <div className="metric-tooltip-card" role="dialog" aria-label={`${label} definition`}>
          <div className="metric-tooltip-title">{label}</div>
          <div className="metric-tooltip-body">{definition}</div>
        </div>
      )}
    </span>
  );
}
