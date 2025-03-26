#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Memory file path - same as in the server
const memoryFilePath = path.join(__dirname, 'dist/memory.jsonl');

console.log(`Testing SSE with memory file: ${memoryFilePath}`);

// Function to add a test entity to the memory file
function addTestEntity() {
  const timestamp = new Date().toISOString();
  const testEntity = {
    type: "entity",
    name: `TestEntity_${Date.now()}`,
    entityType: "Thing",
    observations: [`Created at ${timestamp} for testing SSE`]
  };

  // Convert to JSONL format
  const entityLine = JSON.stringify(testEntity);
  
  console.log(`Adding test entity: ${entityLine}`);
  
  try {
    // Ensure directory exists
    const dir = path.dirname(memoryFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // If file doesn't exist, create it; otherwise append to it
    if (!fs.existsSync(memoryFilePath)) {
      fs.writeFileSync(memoryFilePath, entityLine);
      console.log('Created new memory file with test entity');
    } else {
      // Append to the existing file
      fs.appendFileSync(memoryFilePath, '\n' + entityLine);
      console.log('Appended test entity to existing memory file');
    }
    
    console.log('File modification complete - should trigger SSE notification');
  } catch (error) {
    console.error('Error modifying memory file:', error);
  }
}

// Execute the test
addTestEntity();

console.log('Check your browser to see if the SSE notification was received');
console.log('You should see a browser notification and the graph should update automatically'); 