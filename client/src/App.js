import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph from './components/ForceGraph';
import ControlPanel from './components/ControlPanel';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filteredNodeTypes, setFilteredNodeTypes] = useState({});
  const [filteredLinkTypes, setFilteredLinkTypes] = useState({});
  const [lastDataHash, setLastDataHash] = useState('');
  const eventSourceRef = useRef(null);
  const fgRef = useRef(null);

  // Generate a simple hash to detect data changes
  const generateHash = useCallback((data) => {
    return JSON.stringify(data);
  }, []);

  // Process the data for visualization
  const processData = useCallback((data) => {
    const nodes = [];
    const links = [];
    const nodeMap = {};
    
    // First pass: collect all entities
    data.forEach(item => {
      if (item.type === 'entity') {
        const node = {
          id: item.name,
          name: item.name,
          entityType: item.entityType,
          observations: item.observations || [],
        };
        nodes.push(node);
        nodeMap[item.name] = node;
      }
    });
    
    // Second pass: collect all relations
    data.forEach(item => {
      if (item.type === 'relation') {
        links.push({
          source: item.from,
          target: item.to,
          type: item.relationType
        });
      }
    });

    return { nodes, links };
  }, []);

  // Fetch data from the API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/memory-data');
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const processedData = processData(data);
      
      // Check if data has changed using hash
      const dataHash = generateHash(processedData);
      if (dataHash !== lastDataHash) {
        // Set the processed data
        setGraphData(processedData);
        setLastDataHash(dataHash);
        
        // Auto-detect available entity types for filters
        const entityTypes = {};
        processedData.nodes.forEach(node => {
          if (node.entityType) {
            entityTypes[node.entityType] = true; // Default all to visible
          }
        });
        setFilteredNodeTypes(entityTypes);
        
        // Auto-detect available relation types for filters
        const relationTypes = {};
        processedData.links.forEach(link => {
          if (link.type) {
            relationTypes[link.type] = true; // Default all to visible
          }
        });
        setFilteredLinkTypes(relationTypes);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [processData, generateHash, lastDataHash]);

  // Setup data loading mechanism
  useEffect(() => {
    // Initial data load
    fetchData();
    
    // Set up Server-Sent Events for real-time updates
    const setupSSE = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      try {
        // Connect to SSE endpoint
        console.log('%c Connecting to SSE endpoint...', 'background: #222; color: #bada55; padding: 5px;');
        const eventSource = new EventSource('/api/memory-updates');
        eventSourceRef.current = eventSource;
        
        // Handle initial connection
        eventSource.onopen = () => {
          console.log('%c SSE connection established', 'background: #222; color: #bada55; padding: 5px;');
        };
        
        // Handle incoming events
        eventSource.onmessage = (event) => {
          console.log('%c SSE event received:', 'background: #222; color: #bada55; padding: 5px;', event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.updated) {
              console.log(`%c Data update detected at ${data.updated}`, 'background: #222; color: #bada55; padding: 5px;');
              console.log('%c Fetching updated data...', 'background: #222; color: #bada55; padding: 5px;');
              fetchData(); // Fetch latest data when notified of changes
            } else if (data.connected) {
              console.log('%c SSE connection confirmed', 'background: #222; color: #bada55; padding: 5px;');
            }
          } catch (e) {
            console.error('Error parsing SSE message:', e);
          }
        };
        
        // Error handling
        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err);
          
          // Close the connection on error
          eventSource.close();
          eventSourceRef.current = null;
          
          // Attempt to reconnect after a delay
          setTimeout(setupSSE, 5000);
        };
        
        return () => {
          eventSource.close();
        };
      } catch (error) {
        console.error('Failed to establish SSE connection:', error);
        
        // Fallback to polling if SSE setup fails
        const pollingInterval = setInterval(fetchData, 10000);
        return () => clearInterval(pollingInterval);
      }
    };
    
    const cleanup = setupSSE();
    
    return () => {
      if (cleanup) cleanup();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [fetchData]);

  // Handle node click
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    console.log('Selected node:', node);
  };

  // Handle node type filter changes
  const handleNodeFilterChange = (nodeType, checked) => {
    setFilteredNodeTypes(prev => ({
      ...prev,
      [nodeType]: checked
    }));
  };

  // Handle link type filter changes
  const handleLinkFilterChange = (linkType, checked) => {
    setFilteredLinkTypes(prev => ({
      ...prev,
      [linkType]: checked
    }));
  };

  return (
    <div className="app">
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <div>Loading knowledge graph...</div>
        </div>
      ) : error ? (
        <div className="error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <>
          <ForceGraph 
            ref={fgRef}
            graphData={graphData}
            onNodeClick={handleNodeClick}
            filteredNodeTypes={filteredNodeTypes}
            filteredLinkTypes={filteredLinkTypes}
            initialControlsMode="orbit"
            initialAutoRotate={true}
          />
          <ControlPanel 
            graphData={graphData}
            onNodeFilterChange={handleNodeFilterChange}
            onLinkFilterChange={handleLinkFilterChange}
          />
        </>
      )}
    </div>
  );
}

export default App; 