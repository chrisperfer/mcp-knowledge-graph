import React, { useEffect, useState } from 'react';
import FilterPanel from './FilterPanel';
import { getNodeStyle } from '../utils/styleUtils';
import './NodeFilters.css';

/**
 * NodeFilters - A component for filtering node types
 */
const NodeFilters = ({ graphData, onNodeFilterChange }) => {
  const [nodeFilters, setNodeFilters] = useState({});
  
  // Extract unique node types from the graph data and initialize filters
  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;
    
    const entityTypes = {};
    graphData.nodes.forEach(node => {
      if (node.entityType) {
        entityTypes[node.entityType] = true; // Default all filters to true (visible)
      }
    });
    
    setNodeFilters(entityTypes);
  }, [graphData]);
  
  // Handle filter change with local state update
  const handleNodeFilterChange = (nodeType, checked) => {
    setNodeFilters(prev => ({
      ...prev,
      [nodeType]: checked
    }));
    
    // Call parent handler
    onNodeFilterChange(nodeType, checked);
  };

  // Handle toggle all nodes
  const handleToggleAll = (value) => {
    // Create updated filters object
    const updatedFilters = {};
    Object.keys(nodeFilters).forEach(nodeType => {
      updatedFilters[nodeType] = value;
    });
    
    // Update local state
    setNodeFilters(updatedFilters);
    
    // Call parent handler for each filter
    Object.keys(updatedFilters).forEach(nodeType => {
      onNodeFilterChange(nodeType, value);
    });
  };

  // Get node color based on type
  const getNodeColor = (type) => {
    return getNodeStyle(type).color;
  };

  // Create a node types section for filtering by node type
  const nodeTypesSection = {
    id: 'nodeTypes',
    title: 'Node Types',
    type: 'custom',
    collapsible: true,
    defaultExpanded: true,
    customContent: (
      <div className="node-filters-content">
        {Object.keys(nodeFilters).map(nodeType => (
          <div key={nodeType} className="filter-item">
            <label>
              <input
                type="checkbox"
                checked={nodeFilters[nodeType] || false}
                onChange={(e) => handleNodeFilterChange(nodeType, e.target.checked)}
              />
              <span style={{ color: getNodeColor(nodeType) }}>
                {nodeType}
              </span>
            </label>
          </div>
        ))}
      </div>
    )
  };

  // Compile all sections
  const sections = [
    nodeTypesSection
  ];

  return (
    <FilterPanel 
      title="Node Filters"
      sections={sections}
      onToggleAll={handleToggleAll}
    />
  );
};

export default NodeFilters; 