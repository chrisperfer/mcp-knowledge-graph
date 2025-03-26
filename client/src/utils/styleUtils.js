// Color palette for nodes and links
const COLOR_PALETTE = [
  '#4285F4', // Blue
  '#34A853', // Green
  '#FBBC05', // Yellow
  '#EA4335', // Red
  '#9C27B0', // Purple
  '#3F51B5', // Indigo
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#E91E63', // Pink
  '#9E9E9E', // Grey
  '#FF9800', // Orange
  '#CDDC39', // Lime
  '#8BC34A', // Light Green
];

// Available node shapes
const NODE_SHAPES = [
  'sphere',
  'box',
  'cone',
  'cylinder',
  'dodecahedron',
  'icosahedron',
  'octahedron',
  'tetrahedron',
  'torus',
  'brio'  // Add at end so it's not the default
];

// Local storage keys
const NODE_STYLES_KEY = 'mcp_knowledge_graph_node_styles';
const LINK_STYLES_KEY = 'mcp_knowledge_graph_link_styles';

// Clear node styles from local storage
export const clearNodeStyles = () => {
  try {
    localStorage.removeItem(NODE_STYLES_KEY);
  } catch (e) {
    console.error('Error clearing node styles from localStorage:', e);
  }
};

// Clear link styles from local storage
const clearLinkStyles = () => {
  try {
    localStorage.removeItem(LINK_STYLES_KEY);
  } catch (e) {
    console.error('Error clearing link styles from localStorage:', e);
  }
};

// Load styles from local storage
const loadStyles = (key) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error loading styles from localStorage:', e);
    return {};
  }
};

// Save styles to local storage
const saveStyles = (key, styles) => {
  try {
    localStorage.setItem(key, JSON.stringify(styles));
  } catch (e) {
    console.error('Error saving styles to localStorage:', e);
  }
};

// Get consistent color for a type
const getConsistentColor = (type, existingStyles, colorPalette = COLOR_PALETTE) => {
  if (existingStyles[type]?.color) {
    return existingStyles[type].color;
  }
  
  // Find first unused color
  const usedColors = Object.values(existingStyles).map(style => style.color);
  const availableColor = colorPalette.find(color => !usedColors.includes(color)) || colorPalette[0];
  
  return availableColor;
};

// Get consistent shape for a node type
const getConsistentShape = (type, existingStyles) => {
  // Special case for Person type
  if (type === 'Person') {
    return 'brio';
  }
  
  if (existingStyles[type]?.shape) {
    return existingStyles[type].shape;
  }
  
  // Find first unused shape, excluding 'brio' which is reserved for Person
  const usedShapes = Object.values(existingStyles).map(style => style.shape);
  const availableShape = NODE_SHAPES
    .filter(shape => shape !== 'brio') // Exclude brio from general assignment
    .find(shape => !usedShapes.includes(shape)) || 'sphere';
  
  return availableShape;
};

// Update node styles based on current types
export const updateNodeStyles = (nodeTypes) => {
  // Clear existing node styles to force reassignment
  clearNodeStyles();
  const existingStyles = {};
  
  // Add styles for new types
  nodeTypes.forEach(type => {
    if (!existingStyles[type]) {
      existingStyles[type] = {
        color: getConsistentColor(type, existingStyles),
        shape: getConsistentShape(type, existingStyles)
      };
    }
  });
  
  // Save updated styles
  saveStyles(NODE_STYLES_KEY, existingStyles);
  
  return existingStyles;
};

// Update link styles based on current types
export const updateLinkStyles = (linkTypes) => {
  // Clear existing link styles to force reassignment
  clearLinkStyles();
  const existingStyles = {};
  
  // Add styles for new types
  linkTypes.forEach(type => {
    if (!existingStyles[type]) {
      existingStyles[type] = {
        color: getConsistentColor(type, existingStyles)
      };
    }
  });
  
  // Save updated styles
  saveStyles(LINK_STYLES_KEY, existingStyles);
  
  return existingStyles;
};

// Get node style for a type
export const getNodeStyle = (type) => {
  const styles = loadStyles(NODE_STYLES_KEY);
  return styles[type] || { color: '#999999', shape: 'sphere' };
};

// Get link style for a type
export const getLinkStyle = (type) => {
  const styles = loadStyles(LINK_STYLES_KEY);
  return styles[type] || { color: '#999999' };
};

// Get all node styles
export const getAllNodeStyles = () => loadStyles(NODE_STYLES_KEY);

// Get all link styles
export const getAllLinkStyles = () => loadStyles(LINK_STYLES_KEY); 