import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { getNodeStyle, getLinkStyle, updateNodeStyles, updateLinkStyles, clearNodeStyles } from '../utils/styleUtils';
import NavigationToolbar from './NavigationToolbar';
import './ForceGraph.css';

const ForceGraph = forwardRef(({ 
  graphData,
  onNodeClick,
  onNodeHover,
  initialControlsMode = 'orbit',
  initialAutoRotate = true,
  filteredNodeTypes = {},
  filteredLinkTypes = {}
}, ref) => {
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [highlightedLink, setHighlightedLink] = useState(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });
  const [cameraTarget, setCameraTarget] = useState({ x: 0, y: 0, z: 0 });
  const [controlsMode, setControlsMode] = useState(initialControlsMode);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);

  // Handle camera movement
  const handleMoveCamera = useCallback((direction) => {
    if (!ref.current) return;

    const distance = 500; // Match the distance used in revision-viewer
    let position;
    const target = { x: 0, y: 0, z: 0 }; // Look at center

    switch (direction) {
      case 'top':
        // Top view (looking down the y-axis)
        position = { x: 0, y: distance, z: 0 };
        break;
      case 'side':
        // Side view (looking along the x-axis)
        position = { x: distance, y: 0, z: 0 };
        break;
      case 'front':
        // Front view (looking along the z-axis)
        position = { x: 0, y: 0, z: distance };
        break;
      default:
        return;
    }

    // Animate to the new position
    ref.current.cameraPosition(
      position,
      target,
      1000
    );
  }, []);

  // Handle camera reset
  const handleResetCamera = useCallback(() => {
    if (!ref.current) return;

    // Reset to a default isometric-like position
    const distance = 500;
    const position = { x: distance, y: distance, z: distance };
    const target = { x: 0, y: 0, z: 0 };

    ref.current.cameraPosition(
      position,
      target,
      1000
    );
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'f' && highlightedNode) {
        // Focus on the highlighted node
        if (ref.current) {
          // Calculate distance based on node size and observations
          const baseDistance = 40;
          const observationsMultiplier = highlightedNode.observations ? 
            Math.min(highlightedNode.observations.length * 5, 30) : 0;
          const distance = baseDistance + observationsMultiplier;

          const position = new THREE.Vector3(
            highlightedNode.x,
            highlightedNode.y,
            highlightedNode.z
          );

          // Animate to the new position with a slight offset for better viewing
          ref.current.cameraPosition(
            { 
              x: position.x + distance,
              y: position.y + distance/2,
              z: position.z + distance
            },
            position, // lookAt position
            2000 // transition duration in ms
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [highlightedNode]);

  // Update styles when graph data changes
  useEffect(() => {
    if (!graphData?.nodes) return;
    
    // Get unique node types and link types
    const nodeTypes = [...new Set(graphData.nodes.map(node => node.entityType))];
    const linkTypes = [...new Set(graphData.links.map(link => link.type))];
    
    // Clear existing styles before updating
    clearNodeStyles();
    
    // Update styles
    updateNodeStyles(nodeTypes);
    updateLinkStyles(linkTypes);
  }, [graphData]);

  // Filter data based on visibility settings
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const visibleNodes = graphData.nodes.filter(
      node => filteredNodeTypes[node.entityType] !== false
    );
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));

    const visibleLinks = graphData.links.filter(
      link => 
        filteredLinkTypes[link.type] !== false &&
        visibleNodeIds.has(link.source.id || link.source) &&
        visibleNodeIds.has(link.target.id || link.target)
    );

    return {
      nodes: visibleNodes,
      links: visibleLinks
    };
  }, [graphData, filteredNodeTypes, filteredLinkTypes]);

  // Get node color based on type
  const getNodeColor = (node) => {
    if (!node || !node.entityType) return '#999999';
    return getNodeStyle(node.entityType).color;
  };

  // Get link color based on type
  const getLinkColor = (link) => {
    if (!link || !link.type) return '#999999';
    return getLinkStyle(link.type).color;
  };

  // Create a custom 3D object for each node based on its type
  const nodeThreeObject = useCallback((node) => {
    // Determine node color and shape
    const style = getNodeStyle(node.entityType);
    const color = style.color;
    const shapeType = style.shape;
    
    // Node size based on importance or other factors (can be customized)
    const size = node.observations ? Math.min(6 + node.observations.length * 0.5, 10) : 6;
    
    // Create geometry based on shape type
    let geometry;
    switch (shapeType) {
      case 'box':
        geometry = new THREE.BoxGeometry(size, size, size);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(size*0.7, size*1.5, 8);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(size*0.7, size*0.7, size*1.2, 16);
        break;
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(size*0.7);
        break;
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(size*0.7);
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(size*0.7);
        break;
      case 'tetrahedron':
        geometry = new THREE.TetrahedronGeometry(size*0.7);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(size*0.5, size*0.2, 16, 32);
        break;
      case 'brio':
        // Create a group for the Brio-style figure
        const group = new THREE.Group();
        
        // Create head (sphere)
        const headGeometry = new THREE.SphereGeometry(size * 0.6);
        const headMaterial = new THREE.MeshLambertMaterial({ 
          color: color,
          transparent: true,
          opacity: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = size * 0.8; // Position head at top
        group.add(head);
        
        // Create body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(size * 0.4, size * 0.4, size, 16);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
          color: color,
          transparent: true,
          opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        
        return group;
      case 'sphere':
      default:
        geometry = new THREE.SphereGeometry(size);
    }
    
    // Create material with appropriate color
    const material = new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    });
    
    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add pin indicator ONLY if node has fixed coordinates that aren't null/undefined
    const isFixed = node.fx !== null && node.fx !== undefined && 
                   node.fy !== null && node.fy !== undefined && 
                   node.fz !== null && node.fz !== undefined;
    
    if (isFixed) {
      // Create a more visible pin indicator using a cone
      const pinGeometry = new THREE.ConeGeometry(size * 0.4, size * 0.8, 8);
      const pinMaterial = new THREE.MeshBasicMaterial({ 
        color: '#FFD700', // Gold color for pin indicator
        transparent: false,
        opacity: 1
      });
      
      const pin = new THREE.Mesh(pinGeometry, pinMaterial);
      pin.position.y = size * 1.2; // Position above the node
      pin.rotation.x = Math.PI; // Point downward
      mesh.add(pin);
      
      // Add a small sphere at the top of the pin
      const pinHeadGeometry = new THREE.SphereGeometry(size * 0.3);
      const pinHead = new THREE.Mesh(pinHeadGeometry, pinMaterial);
      pinHead.position.y = size * 1.6; // Position at top of pin
      mesh.add(pinHead);

      // Create permanent label for pinned nodes
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 256;

      // Draw the label
      context.fillStyle = 'rgba(32,32,40,0.3)';
      context.filter = 'blur(4px)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.filter = 'none';
      
      // Draw border
      context.strokeStyle = 'rgba(255,255,255,0.1)';
      context.lineWidth = 2;
      context.strokeRect(1, 1, canvas.width-2, canvas.height-2);

      // Draw node name and type
      context.font = 'bold 32px Arial';
      context.textAlign = 'center';
      context.fillStyle = color;
      context.fillText(node.name, canvas.width/2, 50);
      
      context.font = '24px Arial';
      context.fillStyle = '#999';
      context.fillText(`(${node.entityType})`, canvas.width/2, 90);

      // Draw observations if they exist
      if (node.observations && node.observations.length > 0) {
        context.font = '24px Arial';
        context.fillStyle = '#fff';
        context.textAlign = 'left';
        const maxLines = 3;
        node.observations.slice(0, maxLines).forEach((obs, i) => {
          // Truncate long observations
          const truncated = obs.length > 35 ? obs.substring(0, 32) + '...' : obs;
          context.fillText(`• ${truncated}`, 40, 140 + (i * 32));
        });
        if (node.observations.length > maxLines) {
          context.fillStyle = '#999';
          context.fillText(`(+${node.observations.length - maxLines} more)`, 40, 140 + (maxLines * 32));
        }
      }

      // Create sprite from canvas
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      
      // Position the sprite just above the pin
      sprite.position.y = size * 5.8;
      sprite.scale.set(100, 50, 1);
      mesh.add(sprite);
    }
    
    // Add highlight rings only when node is being hovered over
    if (highlightedNode === node && !isFixed) {
      const ringGeometry = new THREE.TorusGeometry(size * 1.5, size * 0.2, 16, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.8
      });
      
      const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
      ring1.rotation.x = Math.PI / 2;
      
      const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
      ring2.rotation.y = Math.PI / 2;
      
      mesh.add(ring1);
      mesh.add(ring2);
    }
    
    return mesh;
  }, [highlightedNode]);

  // Handle node click
  const handleNodeClick = useCallback(node => {
    if (onNodeClick) onNodeClick(node);
    
    // Check if it's a double click (within 300ms of last click)
    const now = Date.now();
    if (node._lastClickTime && (now - node._lastClickTime) < 300) {
      // Double click detected - unpin the node
      node.fx = null;
      node.fy = null;
      node.fz = null;
      if (ref.current) {
        ref.current.refresh();
      }
    } else {
      // Single click - focus camera
      if (ref.current) {
        ref.current.centerAt(node.x, node.y, node.z, 1000);
        ref.current.zoom(1.5, 1000);
      }
    }
    node._lastClickTime = now;
  }, [onNodeClick]);

  // Handle node drag
  const handleNodeDrag = useCallback((node, translate) => {
    // During drag, update the node's position
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
  }, []);

  // Handle end of node drag
  const handleNodeDragEnd = useCallback((node) => {
    // Fix the node at its final position
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
  }, []);

  // Handle node hover
  const handleNodeHover = useCallback(node => {
    if (onNodeHover) onNodeHover(node);
    setHighlightedNode(node || null);
    document.body.style.cursor = node ? 'pointer' : 'default';
  }, [onNodeHover]);

  // Optional: Customize link appearance
  const linkThreeObject = useCallback(link => {
    const isHighlighted = (highlightedNode && 
      (link.source === highlightedNode || 
       link.target === highlightedNode || 
       link.source.id === highlightedNode.id || 
       link.target.id === highlightedNode.id)) ||
      link === highlightedLink;
    
    if (!isHighlighted) return null;

    // Get source and target positions
    const start = typeof link.source === 'object' ? link.source : { x: 0, y: 0, z: 0 };
    const end = typeof link.target === 'object' ? link.target : { x: 0, y: 0, z: 0 };
    
    // Create a vector for the link direction
    const linkVector = new THREE.Vector3(
      end.x - start.x,
      end.y - start.y,
      end.z - start.z
    );
    
    // Calculate the midpoint
    const midPoint = new THREE.Vector3(
      start.x + linkVector.x / 2,
      start.y + linkVector.y / 2,
      start.z + linkVector.z / 2
    );

    // Create a group to hold all link-related objects
    const group = new THREE.Group();
    
    // Add glowing tube along the link
    const tubeGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(start.x, start.y, start.z),
        new THREE.Vector3(midPoint.x, midPoint.y, midPoint.z),
        new THREE.Vector3(end.x, end.y, end.z)
      ]),
      20, // tubular segments
      0.5, // radius
      8, // radial segments
      false // closed
    );
    
    // Create glowing material
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(getLinkColor(link)) },
        viewVector: { value: new THREE.Vector3() }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float intensity;
        void main() {
          vec3 glow = color * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const glowingTube = new THREE.Mesh(tubeGeometry, glowMaterial);
    group.add(glowingTube);
    
    // Create a small label at the midpoint
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background with blur
    context.filter = 'blur(4px)';
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = 'none';
    
    // Draw border
    context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width-2, canvas.height-2);
    
    // Draw text
    context.font = '18px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = getLinkColor(link);
    context.fillText(link.type || 'relationship', canvas.width / 2, canvas.height / 2);
    
    // Create a sprite using the canvas as a texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(material);
    
    // Size and position the sprite
    sprite.scale.set(20, 6, 1);
    sprite.position.copy(midPoint);
    group.add(sprite);

    // Update glow effect on render
    const updateGlow = () => {
      if (glowMaterial.uniforms && ref.current) {
        const camera = ref.current.camera();
        if (camera) {
          glowMaterial.uniforms.viewVector.value = new THREE.Vector3().subVectors(
            camera.position,
            midPoint
          );
        }
      }
    };

    // Add to render loop
    if (ref.current) {
      const onRender = () => {
        updateGlow();
      };
      ref.current._onRender = onRender;
    }
    
    return group;
  }, [highlightedNode, highlightedLink, getLinkColor]);

  // Get link width based on highlight state
  const getLinkWidth = useCallback(link => {
    const isHighlighted = (highlightedNode && 
      (link.source === highlightedNode || 
       link.target === highlightedNode || 
       link.source.id === highlightedNode.id || 
       link.target.id === highlightedNode.id)) ||
      link === highlightedLink;
    
    return isHighlighted ? 4 : 1;
  }, [highlightedNode, highlightedLink]);

  // Handle link hover
  const handleLinkHover = useCallback(link => {
    setHighlightedLink(link);
    document.body.style.cursor = link ? 'pointer' : 'default';
  }, []);

  // Handle zoom-to-fit
  const handleZoomToFit = useCallback((duration = 3000, padding = 50) => {
    if (!ref.current || !filteredData.nodes.length) return;

    ref.current.zoomToFit(duration, padding);
  }, [filteredData.nodes]);

  // On initial load, fit graph to view
  useEffect(() => {
    if (ref.current && filteredData.nodes.length > 0) {
      // Wait for graph to stabilize a bit
      setTimeout(() => {
        handleZoomToFit(2000);
      }, 1000);
    }
  }, [handleZoomToFit, filteredData]);

  // Configure orbit controls when autoRotate changes
  useEffect(() => {
    if (ref.current) {
      const controls = ref.current.controls();
      if (controls) {
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.0;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
      }
    }
  }, [autoRotate]);

  return (
    <div className="force-graph-container">
      <NavigationToolbar 
        onReset={handleResetCamera}
        onZoomToFit={() => handleZoomToFit(2000)}
        onMoveCamera={handleMoveCamera}
        controlsMode={controlsMode}
        onControlsModeChange={mode => setControlsMode(mode)}
        autoRotate={autoRotate}
        onAutoRotateChange={rotate => setAutoRotate(rotate)}
      />
      <ForceGraph3D
        ref={ref}
        graphData={filteredData}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkThreeObject={linkThreeObject}
        linkThreeObjectExtend={true}
        linkWidth={getLinkWidth}
        linkDirectionalParticles={link => (link === highlightedLink || (highlightedNode && 
          (link.source === highlightedNode || 
           link.target === highlightedNode || 
           link.source.id === highlightedNode.id || 
           link.target.id === highlightedNode.id))) ? 6 : 2}
        linkDirectionalParticleWidth={link => (link === highlightedLink || (highlightedNode && 
          (link.source === highlightedNode || 
           link.target === highlightedNode || 
           link.source.id === highlightedNode.id || 
           link.target.id === highlightedNode.id))) ? 4 : 2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={getLinkColor}
        linkColor={getLinkColor}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        controlType={controlsMode}
        autoRotate={autoRotate}
        enableRotate={true}
        rotateSpeed={0.5}
        enableNavigationControls={true}
        enableNodeDrag={true}
        backgroundColor="#000011"
        enablePointerInteraction={true}
        showNavInfo={false}
        nodeLabel={node => `
<div style="background: rgba(32,32,40,0.3); padding: 8px; border-radius: 4px; max-width: 300px; font-family: Arial, sans-serif; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1);">
  <div style="margin-bottom: 6px;">
    <span style="color: ${getNodeColor(node)}; font-size: 14px; font-weight: bold;">${node.name}</span>
    <span style="color: #999; font-size: 11px;"> (${node.entityType})</span>
  </div>
  ${node.observations && node.observations.length > 0 ? `
    <div style="color: #fff; font-size: 12px;">
      <ul style="margin: 0; padding-left: 16px; list-style-type: circle;">
        ${node.observations.map(obs => `<li style="margin-bottom: 3px;">${obs}</li>`).join('')}
      </ul>
    </div>
  ` : '<div style="color: #666;">No observations</div>'}
</div>`}
      />
    </div>
  );
});

export default ForceGraph; 