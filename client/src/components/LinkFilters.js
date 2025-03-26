import React, { useEffect, useState } from 'react';
import FilterPanel from './FilterPanel';
import { getLinkStyle } from '../utils/styleUtils';
import './LinkFilters.css';

/**
 * LinkFilters - A component for filtering link types
 */
const LinkFilters = ({ graphData, onLinkFilterChange }) => {
  const [linkFilters, setLinkFilters] = useState({});
  
  // Extract unique link types from the graph data and initialize filters
  useEffect(() => {
    if (!graphData || !graphData.links || graphData.links.length === 0) return;
    
    const linkTypes = {};
    graphData.links.forEach(link => {
      if (link.type) {
        linkTypes[link.type] = true; // Default all filters to true (visible)
      }
    });
    
    setLinkFilters(linkTypes);
  }, [graphData]);
  
  // Handle filter change with local state update
  const handleLinkFilterChange = (linkType, checked) => {
    setLinkFilters(prev => ({
      ...prev,
      [linkType]: checked
    }));
    
    // Call parent handler
    onLinkFilterChange(linkType, checked);
  };

  // Handle toggle all links
  const handleToggleAll = (value) => {
    // Create updated filters object
    const updatedFilters = {};
    Object.keys(linkFilters).forEach(linkType => {
      updatedFilters[linkType] = value;
    });
    
    // Update local state
    setLinkFilters(updatedFilters);
    
    // Call parent handler for each filter
    Object.keys(updatedFilters).forEach(linkType => {
      onLinkFilterChange(linkType, value);
    });
  };

  // Get link color based on type
  const getLinkColor = (type) => {
    return getLinkStyle(type).color;
  };

  // Create a link types section for filtering by link type
  const linkTypesSection = {
    id: 'linkTypes',
    title: 'Link Types',
    type: 'custom',
    collapsible: true,
    defaultExpanded: true,
    customContent: (
      <div className="link-filters-content">
        {Object.keys(linkFilters).map(linkType => (
          <div key={linkType} className="filter-item">
            <label>
              <input
                type="checkbox"
                checked={linkFilters[linkType] || false}
                onChange={(e) => handleLinkFilterChange(linkType, e.target.checked)}
              />
              <span style={{ color: getLinkColor(linkType) }}>
                {linkType}
              </span>
            </label>
          </div>
        ))}
      </div>
    )
  };

  // Compile all sections
  const sections = [
    linkTypesSection
  ];

  return (
    <FilterPanel 
      title="Link Filters"
      sections={sections}
      onToggleAll={handleToggleAll}
    />
  );
};

export default LinkFilters; 