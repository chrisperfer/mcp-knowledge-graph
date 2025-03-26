import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import open from 'open';
import http from 'http';
import fs from 'fs';
import net from 'net';
import cors from 'cors';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory (one level up from src)
const rootDir = path.resolve(__dirname, '..');

const app = express();
const DEFAULT_PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Configure body-parser with increased limits
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Memory path storage
let configuredMemoryPath = path.join(rootDir, 'dist/memory.jsonl');

// Store connected SSE clients
const sseClients = new Set<express.Response>();

// File watcher instance
let fileWatcher: any = null;

// Function to send updates to all connected clients
function notifyClients() {
  console.log(`Notifying ${sseClients.size} connected clients about data changes`);
  
  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify({ updated: new Date().toISOString() })}\n\n`);
    } catch (error) {
      console.error('Error sending update to client:', error);
      // Remove failed client from set
      sseClients.delete(client);
    }
  });
}

// Set up file watcher
function setupFileWatcher(filePath: string) {
  console.log(`Setting up file watcher for: ${filePath}`);
  
  // Close any existing watcher
  if (fileWatcher) {
    console.log('Closing existing file watcher');
    fileWatcher.close();
  }
  
  // Watch for changes to the memory file
  const newFileWatcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });
  
  newFileWatcher.on('ready', () => {
    console.log(`Watcher ready for: ${filePath}`);
  });
  
  newFileWatcher.on('change', (path) => {
    console.log(`Memory file changed: ${path}, notifying clients`);
    notifyClients();
  });
  
  newFileWatcher.on('error', (error) => {
    console.error(`File watcher error: ${error}`);
  });
  
  return newFileWatcher;
}

// Initialize file watcher
fileWatcher = setupFileWatcher(configuredMemoryPath);

/**
 * Check if a port is in use
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - True if the port is in use, false otherwise
 */
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

/**
 * Find the process using a port and kill it
 * @param {number} port - The port to check
 * @returns {Promise<void>}
 */
async function killProcessOnPort(port: number): Promise<void> {
  if (process.platform === 'win32') {
    // Windows
    await new Promise((resolve, reject) => {
      const cmd = require('child_process').exec(`netstat -ano | findstr :${port}`);
      cmd.stdout.on('data', (data: string) => {
        const lines = data.split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 4) {
            const pid = parts[4];
            try {
              process.kill(Number(pid));
            } catch (err) {
              // Ignore errors if process is already gone
            }
          }
        });
      });
      resolve(null);
    });
  } else {
    // Unix-like systems (macOS, Linux)
    await new Promise((resolve, reject) => {
      const cmd = require('child_process').exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
      cmd.on('close', resolve);
    });
  }
}

// Add API endpoint to directly serve the memory.jsonl file content
app.get('/api/memory-data', async (req, res) => {
  try {
    // Check if file exists
    if (!fs.existsSync(configuredMemoryPath)) {
      return res.json([]);
    }
    
    // Read the file
    const data = await fs.promises.readFile(configuredMemoryPath, 'utf-8');
    
    if (!data.trim()) {
      return res.json([]);
    }
    
    // Parse JSONL
    try {
      const lines = data.trim().split('\n');
      const jsonData = lines.map(line => JSON.parse(line));
      res.json(jsonData);
    } catch (parseError: any) {
      res.status(500).json({ error: `Failed to parse memory file: ${parseError.message}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read memory file' });
  }
});

// Add API endpoint to get memory path info (for debugging)
app.get('/api/memory-path', (req, res) => {
  try {
    // Check if the file exists and get stats
    let fileExists = false;
    let fileSize = 0;
    let fileContents = '';
    
    try {
      if (fs.existsSync(configuredMemoryPath)) {
        fileExists = true;
        const stats = fs.statSync(configuredMemoryPath);
        fileSize = stats.size;
        
        // Get a preview of file contents (first few lines) if it's not too large
        if (fileSize < 10000) { // Only if file is less than 10KB
          fileContents = fs.readFileSync(configuredMemoryPath, 'utf-8').slice(0, 500) + '...';
        }
      }
    } catch (fsError) {
      // Ignore file system errors
    }
    
    res.json({
      path: configuredMemoryPath,
      exists: fileExists,
      size: fileSize,
      isAbsolute: path.isAbsolute(configuredMemoryPath),
      relativePath: path.relative(rootDir, configuredMemoryPath),
      rootDir: rootDir,
      preview: fileExists ? fileContents : null,
      outsideProject: !configuredMemoryPath.startsWith(rootDir) && path.isAbsolute(configuredMemoryPath)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error when getting memory path' });
  }
});

// Add a debugging endpoint to directly check the JSONL file
app.get('/api/debug', async (req, res) => {
  try {
    const results: {
      memoryPath: string;
      fileExists: boolean;
      fileStats: {
        size: number;
        created: Date;
        modified: Date;
        isFile: boolean;
      } | null;
      fileContent: string | null;
      parsedData: {
        lineCount: number;
        sampleLines: string[];
        parsedItems: Array<any>;
      } | null;
      error: string | null;
    } = {
      memoryPath: configuredMemoryPath,
      fileExists: false,
      fileStats: null,
      fileContent: null,
      parsedData: null,
      error: null
    };
    
    // Check if file exists
    if (fs.existsSync(configuredMemoryPath)) {
      results.fileExists = true;
      
      // Get file stats
      const stats = fs.statSync(configuredMemoryPath);
      results.fileStats = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      };
      
      // Read file content (limit to first 50KB if large)
      const data = await fs.promises.readFile(configuredMemoryPath, 'utf-8');
      results.fileContent = data.length > 50000 ? data.slice(0, 50000) + '...(truncated)' : data;
      
      // Try to parse the content
      try {
        if (data.trim()) {
          const lines = data.trim().split('\n');
          results.parsedData = {
            lineCount: lines.length,
            sampleLines: lines.slice(0, 5),
            parsedItems: []
          };
          
          // Parse each line and collect results
          for (let i = 0; i < Math.min(lines.length, 10); i++) {
            try {
              const parsed = JSON.parse(lines[i]);
              if (results.parsedData) {
                results.parsedData.parsedItems.push({
                  index: i,
                  type: parsed.type,
                  success: true,
                  data: parsed
                });
              }
            } catch (lineError: any) {
              if (results.parsedData) {
                results.parsedData.parsedItems.push({
                  index: i,
                  success: false,
                  error: lineError.message,
                  line: lines[i]
                });
              }
            }
          }
        } else {
          results.error = 'File is empty';
        }
      } catch (parseError: any) {
        results.error = `Failed to parse JSONL: ${parseError.message}`;
      }
    } else {
      results.error = `File does not exist at path: ${configuredMemoryPath}`;
    }
    
    res.json(results);
  } catch (error: any) {
    res.status(500).json({
      error: `Server error: ${error.message}`,
      stack: error.stack
    });
  }
});

// Add API endpoint for Server-Sent Events
app.get('/api/memory-updates', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  console.log('New SSE client connected');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ connected: true, timestamp: new Date().toISOString() })}\n\n`);
  
  // Add client to the set
  sseClients.add(res);
  console.log(`Total connected clients: ${sseClients.size}`);
  
  // Remove client when connection closes
  req.on('close', () => {
    console.log('SSE client disconnected');
    sseClients.delete(res);
    console.log(`Remaining connected clients: ${sseClients.size}`);
  });
});

// Serve static files from the public directory (new React app)
app.use(express.static(path.join(rootDir, 'public')));

// Route for the main visualization - serve React app
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

// Catch-all route to handle React router routes
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

// Start the server
/**
 * Starts the visualization server
 * @param {string} memoryPath - Optional path to the memory.jsonl file
 * @param {number} port - Optional port number (defaults to 3000)
 * @returns {Promise<http.Server>} The server instance
 */
export async function startServer(memoryPath?: string, port: number = DEFAULT_PORT): Promise<http.Server> {
  // Update memory path if provided
  if (memoryPath) {
    configuredMemoryPath = memoryPath;
    
    // Set up new file watcher with updated path
    fileWatcher = setupFileWatcher(configuredMemoryPath);
  }

  // Check if port is in use
  const portInUse = await isPortInUse(port);
  if (portInUse) {
    console.log(`Port ${port} is in use. Attempting to kill the existing process...`);
    try {
      await killProcessOnPort(port);
      // Wait a bit for the port to be freed
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to kill process on port ${port}:`, error);
      throw new Error(`Port ${port} is in use and could not be freed`);
    }
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Knowledge Graph visualization server running at http://localhost:${port}`);
      open(`http://localhost:${port}`);
      resolve(server);
    }).on('error', (error: any) => {
      reject(error);
    });
  });
}

// Stop the server
/**
 * Stops the visualization server
 * @param {http.Server} server - The server instance to stop
 */
export function stopServer(server: http.Server): void {
  // Close the file watcher
  if (fileWatcher) {
    fileWatcher.close();
  }
  
  // Clear all SSE clients
  sseClients.clear();
  
  if (server) {
    server.close();
  }
}

// Direct execution check
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
} 