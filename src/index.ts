import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import { isAbsolute } from 'path';
import http from 'http';

// Import visualization server modules
import { startServer, stopServer } from './server.js';
// Import visualization commands
import { visualizationCommands } from './mcp-viz-commands.js';

// Global reference for visualization server
let vizServer: http.Server | null = null;

export function getVizServer(): http.Server | null {
    return vizServer;
}

export function setVizServer(server: http.Server | null): void {
    vizServer = server;
}

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
    string: ['memory-path'],
    boolean: ['no-viz'],
    default: {
        'no-viz': false,
        'port': 3000
    }
});

// If a custom path is provided, ensure it's absolute
if (argv['memory-path'] && !isAbsolute(argv['memory-path'])) {
    argv['memory-path'] = path.resolve(process.cwd(), argv['memory-path']);
}

// Define the path to the JSONL file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use the custom path or default to the installation directory
export const MEMORY_FILE_PATH = argv['memory-path'] || path.join(__dirname, '../dist/memory.jsonl');

// We are storing our memory using entities, relations, and observations in a graph structure
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
class KnowledgeGraphManager {
  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
      const lines = data.split("\n").filter(line => line.trim() !== "");
      return lines.reduce((graph: KnowledgeGraph, line) => {
        const item = JSON.parse(line);
        if (item.type === "entity") graph.entities.push(item as Entity);
        if (item.type === "relation") graph.relations.push(item as Relation);
        return graph;
      }, { entities: [], relations: [] });
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === "ENOENT") {
        return { entities: [], relations: [] };
      }
      throw error;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    const lines = [
      ...graph.entities.map(e => JSON.stringify({ type: "entity", ...e })),
      ...graph.relations.map(r => JSON.stringify({ type: "relation", ...r })),
    ];
    await fs.writeFile(MEMORY_FILE_PATH, lines.join("\n"));
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const newEntities = entities.filter(e => !graph.entities.some(existingEntity => existingEntity.name === e.name));
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const newRelations = relations.filter(r => !graph.relations.some(existingRelation =>
      existingRelation.from === r.from &&
      existingRelation.to === r.to &&
      existingRelation.relationType === r.relationType
    ));
    graph.relations.push(...newRelations);
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results = observations.map(o => {
      const entity = graph.entities.find(e => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObservations = o.contents.filter(content => !entity.observations.includes(content));
      entity.observations.push(...newObservations);
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.entities = graph.entities.filter(e => !entityNames.includes(e.name));
    graph.relations = graph.relations.filter(r => !entityNames.includes(r.from) && !entityNames.includes(r.to));
    await this.saveGraph(graph);
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    const graph = await this.loadGraph();
    deletions.forEach(d => {
      const entity = graph.entities.find(e => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(o => !d.observations.includes(o));
      }
    });
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.relations = graph.relations.filter(r => !relations.some(delRelation =>
      r.from === delRelation.from &&
      r.to === delRelation.to &&
      r.relationType === delRelation.relationType
    ));
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const filteredEntities = graph.entities.filter(e =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.entityType.toLowerCase().includes(query.toLowerCase()) ||
      e.observations.some(o => o.toLowerCase().includes(query.toLowerCase()))
    );
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
    const filteredRelations = graph.relations.filter(r =>
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );
    return {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const filteredEntities = graph.entities.filter(e => names.includes(e.name));
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
    const filteredRelations = graph.relations.filter(r =>
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );
    return {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  }
}

const knowledgeGraphManager = new KnowledgeGraphManager();

// The server instance and tools exposed to Claude
const server = new Server({
    name: "mcp-knowledge-graph",
    version: "1.0.1",
}, {
    capabilities: {
        tools: {},
    },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "create_entities",
                description: "Create multiple new entities in the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        entities: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "The name of the entity" },
                                    entityType: { type: "string", description: "The type of the entity" },
                                    observations: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "An array of observation contents associated with the entity"
                                    },
                                },
                                required: ["name", "entityType", "observations"],
                            },
                        },
                    },
                    required: ["entities"],
                },
            },
            {
                name: "create_relations",
                description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
                inputSchema: {
                    type: "object",
                    properties: {
                        relations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    from: { type: "string", description: "The name of the source entity" },
                                    to: { type: "string", description: "The name of the target entity" },
                                    relationType: { type: "string", description: "The type of relation between the entities" },
                                },
                                required: ["from", "to", "relationType"],
                            },
                        },
                    },
                    required: ["relations"],
                },
            },
            {
                name: "add_observations",
                description: "Add observations to existing entities in the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        observations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    entityName: { type: "string", description: "The name of the entity to add observations to" },
                                    contents: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "An array of observation contents to add"
                                    },
                                },
                                required: ["entityName", "contents"],
                            },
                        },
                    },
                    required: ["observations"],
                },
            },
            {
                name: "delete_entities",
                description: "Delete entities from the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        entityNames: {
                            type: "array",
                            items: { type: "string" },
                            description: "An array of entity names to delete"
                        },
                    },
                    required: ["entityNames"],
                },
            },
            {
                name: "delete_observations",
                description: "Delete observations from entities in the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        deletions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    entityName: { type: "string", description: "The name of the entity to delete observations from" },
                                    observations: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "An array of observation contents to delete"
                                    },
                                },
                                required: ["entityName", "observations"],
                            },
                        },
                    },
                    required: ["deletions"],
                },
            },
            {
                name: "delete_relations",
                description: "Delete relations from the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        relations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    from: { type: "string", description: "The name of the source entity" },
                                    to: { type: "string", description: "The name of the target entity" },
                                    relationType: { type: "string", description: "The type of relation between the entities" },
                                },
                                required: ["from", "to", "relationType"],
                            },
                        },
                    },
                    required: ["relations"],
                },
            },
            {
                name: "read_graph",
                description: "Read the entire knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "search_nodes",
                description: "Search for nodes in the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query to match against node names, types, and observations"
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "open_nodes",
                description: "Get specific nodes and their relations from the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        names: {
                            type: "array",
                            items: { type: "string" },
                            description: "An array of node names to retrieve"
                        },
                    },
                    required: ["names"],
                },
            },
            // Add visualization commands
            {
                name: visualizationCommands[0].name,
                description: visualizationCommands[0].description,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: visualizationCommands[1].name,
                description: visualizationCommands[1].description,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: visualizationCommands[2].name,
                description: visualizationCommands[2].description,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    if (!args) {
        throw new Error(`No arguments provided for tool: ${name}`);
    }
    
    let result;
    switch (name) {
        case "create_entities":
            result = await knowledgeGraphManager.createEntities(args.entities as Entity[]);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        case "create_relations":
            result = await knowledgeGraphManager.createRelations(args.relations as Relation[]);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        case "add_observations":
            result = await knowledgeGraphManager.addObservations(args.observations as { entityName: string; contents: string[] }[]);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        case "delete_entities":
            await knowledgeGraphManager.deleteEntities(args.entityNames as string[]);
            return { content: [{ type: "text", text: "Entities deleted successfully" }] };
        case "delete_observations":
            await knowledgeGraphManager.deleteObservations(args.deletions as { entityName: string; observations: string[] }[]);
            return { content: [{ type: "text", text: "Observations deleted successfully" }] };
        case "delete_relations":
            await knowledgeGraphManager.deleteRelations(args.relations as Relation[]);
            return { content: [{ type: "text", text: "Relations deleted successfully" }] };
        case "read_graph":
            result = await knowledgeGraphManager.readGraph();
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        case "search_nodes":
            result = await knowledgeGraphManager.searchNodes(args.query as string);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        case "open_nodes":
            result = await knowledgeGraphManager.openNodes(args.names as string[]);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        case visualizationCommands[0].name:
            result = await visualizationCommands[0].handler();
            return result;
        case visualizationCommands[1].name:
            result = await visualizationCommands[1].handler();
            return result;
        case visualizationCommands[2].name:
            result = await visualizationCommands[2].handler();
            return result;
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Knowledge Graph MCP Server running on stdio");
    
    // Auto-start visualization server if not disabled
    if (!argv['no-viz']) {
        try {
            const server = await startServer(MEMORY_FILE_PATH, argv.port);
            setVizServer(server);
            console.error(`Knowledge graph visualization started automatically on port ${argv.port}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to start visualization server:', errorMessage);
        }
    }
    
    // Register shutdown handler
    process.on('SIGINT', () => {
        console.error('Shutting down...');
        
        // Stop the visualization server if it's running
        const currentServer = getVizServer();
        if (currentServer) {
            stopServer(currentServer);
            setVizServer(null);
        }
        
        process.exit(0);
    });
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
}); 