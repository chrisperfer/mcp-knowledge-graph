import React, { useState } from 'react';
import FiltersPanel from './FiltersPanel';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './ControlPanel.css';

/**
 * ControlPanel - A collapsible panel that contains all the filter controls
 */
const ControlPanel = ({
  graphData,
  onNodeFilterChange,
  onLinkFilterChange
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`control-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="control-panel-toggle" onClick={toggleCollapsed}>
        {collapsed ? <FaChevronLeft /> : <FaChevronRight />}
      </div>
      
      <div className="control-panel-content">
        <FiltersPanel
          graphData={graphData}
          onNodeFilterChange={onNodeFilterChange}
          onLinkFilterChange={onLinkFilterChange}
        />
      </div>
    </div>
  );
};

export default ControlPanel; 