import React from 'react';
import FilterPanel from './FilterPanel';
import './CameraControls.css';

/**
 * CameraControls component - Provides UI controls for camera manipulation in a 3D force graph
 */
const CameraControls = ({
  controlsMode = 'orbit',
  onControlsModeChange,
  autoRotate = true,
  onAutoRotateChange,
  onZoomToFit
}) => {
  // Create camera controls section
  const cameraControlsSection = {
    id: 'cameraControls',
    title: 'Camera Settings',
    type: 'custom',
    collapsible: true,
    defaultExpanded: true,
    customContent: (
      <div className="camera-controls-content">
        {/* Controls Mode Selector */}
        <div className="camera-controls-row">
          <label htmlFor="camera-controls-mode">Controls Mode:</label>
          <select 
            id="camera-controls-mode"
            value={controlsMode} 
            onChange={(e) => onControlsModeChange && onControlsModeChange(e.target.value)}
          >
            <option value="orbit">Orbit</option>
            <option value="trackball">Trackball</option>
            <option value="fly">Fly</option>
          </select>
        </div>

        {/* Auto-rotate Toggle */}
        <div className="camera-controls-toggle">
          <input 
            type="checkbox" 
            id="camera-auto-rotate"
            checked={autoRotate} 
            onChange={(e) => onAutoRotateChange && onAutoRotateChange(e.target.checked)}
          />
          <label htmlFor="camera-auto-rotate">Auto-rotate</label>
        </div>

        {/* Zoom to fit button */}
        {onZoomToFit && (
          <div className="camera-controls-button">
            <button onClick={onZoomToFit}>Zoom to Fit</button>
          </div>
        )}
      </div>
    )
  };

  // Compile all sections
  const sections = [
    cameraControlsSection
  ];

  return (
    <FilterPanel 
      title="Camera Controls"
      sections={sections}
    />
  );
};

export default CameraControls; 