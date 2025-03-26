import React, { useEffect, useState } from 'react';
import FilterPanel from './FilterPanel';
import './FiltersPanel.css';
import { getNodeStyle, getLinkStyle } from '../utils/styleUtils';

/**
 * FiltersPanel - A consolidated component for filtering both node and link types
 */
const FiltersPanel = ({ 
  graphData, 
  onNodeFilterChange,
  onLinkFilterChange
}) => {
  const [nodeFilters, setNodeFilters] = useState({});
  const [linkFilters, setLinkFilters] = useState({});
  const [hideUnconnectedNodes, setHideUnconnectedNodes] = useState(false);
  
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
  
  // Handle node filter change with local state update
  const handleNodeFilterChange = (nodeType, checked) => {
    setNodeFilters(prev => ({
      ...prev,
      [nodeType]: checked
    }));
    
    // Call parent handler
    onNodeFilterChange(nodeType, checked);
  };
  
  // Handle link filter change with local state update
  const handleLinkFilterChange = (linkType, checked) => {
    setLinkFilters(prev => ({
      ...prev,
      [linkType]: checked
    }));
    
    // Call parent handler
    onLinkFilterChange(linkType, checked);
  };

  // Handle hide unconnected nodes toggle
  const handleHideUnconnectedNodes = (checked) => {
    setHideUnconnectedNodes(checked);
    
    // Create a map of visible links
    const visibleLinks = graphData.links.filter(link => 
      linkFilters[link.type] !== false
    );

    // Create a set of connected node IDs
    const connectedNodeIds = new Set();
    visibleLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });

    // Update visibility for all node types
    Object.keys(nodeFilters).forEach(nodeType => {
      const nodes = graphData.nodes.filter(node => node.entityType === nodeType);
      const hasVisibleNodes = nodes.some(node => 
        !checked || connectedNodeIds.has(node.id)
      );
      
      // Only update if the visibility would change
      if (nodeFilters[nodeType] !== hasVisibleNodes) {
        handleNodeFilterChange(nodeType, hasVisibleNodes);
      }
    });
  };

  // Handle toggle all nodes
  const handleToggleAllNodes = (value) => {
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

    // Reset hide unconnected nodes when showing all
    if (value && hideUnconnectedNodes) {
      setHideUnconnectedNodes(false);
    }
  };
  
  // Handle toggle all links
  const handleToggleAllLinks = (value) => {
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

    // Update node visibility if hiding unconnected nodes
    if (hideUnconnectedNodes) {
      handleHideUnconnectedNodes(true);
    }
  };
  
  // Handle toggle all filters (both nodes and links)
  const handleToggleAll = (value) => {
    handleToggleAllNodes(value);
    handleToggleAllLinks(value);
  };

  // Get node color based on type
  const getNodeColor = (type) => {
    return getNodeStyle(type).color;
  };
  
  // Get link color based on type
  const getLinkColor = (type) => {
    return getLinkStyle(type).color;
  };

  // Create visibility settings section
  const visibilitySection = {
    id: 'visibility',
    title: 'Visibility Settings',
    type: 'custom',
    collapsible: true,
    defaultExpanded: true,
    customContent: (
      <div className="visibility-settings">
        <div className="filter-item">
          <label>
            <input
              type="checkbox"
              checked={hideUnconnectedNodes}
              onChange={(e) => handleHideUnconnectedNodes(e.target.checked)}
            />
            <span>Hide unconnected nodes</span>
          </label>
        </div>
      </div>
    )
  };

  // Create a node types section for filtering by node type
  const nodeTypesSection = {
    id: 'nodeTypes',
    title: 'Node Types',
    type: 'custom',
    collapsible: true,
    defaultExpanded: true,
    onToggleSection: handleToggleAllNodes,
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
  
  // Create a link types section for filtering by link type
  const linkTypesSection = {
    id: 'linkTypes',
    title: 'Link Types',
    type: 'custom',
    collapsible: true,
    defaultExpanded: true,
    onToggleSection: handleToggleAllLinks,
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
    visibilitySection,
    nodeTypesSection,
    linkTypesSection
  ];

  return (
    <FilterPanel 
      title="Filters"
      sections={sections}
      onToggleAll={handleToggleAll}
    />
  );
};

export default FiltersPanel; 