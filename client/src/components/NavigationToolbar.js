import React from 'react';
import { FaArrowDown, FaArrowRight, FaArrowUp, FaUndo, FaExpand, FaSync, FaCube } from 'react-icons/fa';
import './NavigationToolbar.css';

const NavigationToolbar = ({ 
  onReset, 
  onZoomToFit, 
  onMoveCamera,
  controlsMode,
  onControlsModeChange,
  autoRotate,
  onAutoRotateChange
}) => {
  return (
    <div className="navigation-toolbar">
      <button 
        className="nav-button" 
        onClick={() => onMoveCamera('top')}
        title="Top view"
      >
        <FaArrowDown />
      </button>
      <button 
        className="nav-button" 
        onClick={() => onMoveCamera('side')}
        title="Side view"
      >
        <FaArrowRight />
      </button>
      <button 
        className="nav-button" 
        onClick={() => onMoveCamera('front')}
        title="Front view"
      >
        <FaArrowUp />
      </button>
      <button 
        className="nav-button" 
        onClick={onReset}
        title="Reset camera position"
      >
        <FaUndo />
      </button>
      <button 
        className="nav-button" 
        onClick={onZoomToFit}
        title="Zoom to fit all nodes"
      >
        <FaExpand />
      </button>
      <div className="nav-separator" />
      <select
        className="nav-select"
        value={controlsMode}
        onChange={(e) => onControlsModeChange(e.target.value)}
        title="Camera controls mode"
      >
        <option value="orbit">Orbit</option>
        <option value="trackball">Trackball</option>
        <option value="fly">Fly</option>
      </select>
      <button 
        className={`nav-button ${autoRotate ? 'active' : ''}`}
        onClick={() => onAutoRotateChange(!autoRotate)}
        title="Toggle auto-rotate"
      >
        <FaSync />
      </button>
    </div>
  );
};

export default NavigationToolbar; 