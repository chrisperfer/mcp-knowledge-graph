import React, { useState } from 'react';
import './FilterPanel.css';

/**
 * FilterPanel - A reusable, configurable component for filter panels
 */
const FilterPanel = ({ 
  title, 
  sections = [],
  onToggleAll = null
}) => {
  // Keep track of expanded state for each collapsible section
  const [expandedSections, setExpandedSections] = useState(
    sections.reduce((acc, section) => {
      acc[section.id] = section.defaultExpanded || false;
      return acc;
    }, {})
  );

  const toggleSectionExpanded = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const renderSectionContent = (section) => {
    switch (section.type) {
      case 'custom':
        return section.customContent;
      default:
        return <div>Unsupported section type</div>;
    }
  };

  const renderSection = (section) => {
    const isExpanded = expandedSections[section.id];
    
    return (
      <div key={section.id} className="filter-section">
        <div className="section-header-container">
          {section.collapsible ? (
            <div 
              className="section-header" 
              onClick={() => toggleSectionExpanded(section.id)}
            >
              <h3>{section.title}</h3>
              <span className={`collapse-icon ${isExpanded ? 'expanded' : 'collapsed'}`}>
                {isExpanded ? '▼' : '►'}
              </span>
            </div>
          ) : (
            <div className="section-header">
              <h3>{section.title}</h3>
            </div>
          )}
          
          {section.onToggleSection && (
            <div className="section-toggle-buttons">
              <button className="compact-button" onClick={() => section.onToggleSection(true)}>All</button>
              <button className="compact-button" onClick={() => section.onToggleSection(false)}>None</button>
            </div>
          )}
        </div>
        
        {(!section.collapsible || isExpanded) && (
          <div className="section-content">
            {renderSectionContent(section)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h2>{title}</h2>
        {onToggleAll && (
          <div className="filter-toggle-all">
            <button className="compact-button" onClick={() => onToggleAll(true)}>All</button>
            <button className="compact-button" onClick={() => onToggleAll(false)}>None</button>
          </div>
        )}
      </div>
      <div className="filter-panel-content">
        {sections.map(renderSection)}
      </div>
    </div>
  );
};

export default FilterPanel; 