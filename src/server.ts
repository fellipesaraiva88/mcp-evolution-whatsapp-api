#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { createTools } from "./tools";

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize MCP Server
const server = new Server(
    {
        name: "Evolution API MCP Server",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

const tools = createTools();

// Setup MCP Server handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: tools.map(({ handler, ...tool }) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        })),
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;
    
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
    try {
        const result = await tool.handler(args || {});
        return {
            content: [
                {
                    type: "text",
                    text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }
            ]
        };
    } catch (error) {
        throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Evolution API MCP Server',
        version: '0.1.0',
        timestamp: new Date().toISOString()
    });
});

// List tools endpoint
app.get('/tools', async (req, res) => {
    try {
        const toolsList = tools.map(({ handler, ...tool }) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        }));
        
        res.json({ tools: toolsList });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to list tools',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});

// Execute tool endpoint
app.post('/tools/:toolName', async (req, res) => {
    try {
        const { toolName } = req.params;
        const args = req.body;

        const tool = tools.find((t) => t.name === toolName);

        if (!tool) {
            return res.status(404).json({ 
                error: `Unknown tool: ${toolName}`,
                availableTools: tools.map(t => t.name)
            });
        }

        // Execute tool handler
        try {
            const result = await tool.handler(args);
            res.json(result);
        } catch (error) {
            // Handle authentication errors
            if (error instanceof Error && 
               (error.message.includes('EVOLUTION_API_KEY') || 
                error.message.includes('EVOLUTION_API_URL'))) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'Please provide your Evolution API credentials in the configuration settings.'
                });
            }
            
            // Handle other errors
            res.status(500).json({
                error: 'Tool execution failed',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});

// Create WebSocket Server for MCP
const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/mcp'
});

wss.on('connection', (ws) => {
    console.log('🔌 New MCP WebSocket connection established');
    
    // Create WebSocket transport for MCP
    const transport = {
        start: async () => {
            console.log('🚀 MCP WebSocket transport started');
        },
        close: async () => {
            console.log('🔌 MCP WebSocket transport closed');
            ws.close();
        },
        send: async (message: any) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
    };
    
    // Handle incoming WebSocket messages
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📨 Received MCP message:', message.method || 'unknown');
            
            // Handle MCP protocol messages
            if (message.method === 'initialize') {
                const response = {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: 'Evolution API MCP Server',
                            version: '0.1.0'
                        }
                    }
                };
                ws.send(JSON.stringify(response));
            } else if (message.method === 'tools/list') {
                const response = {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: {
                        tools: tools.map(({ handler, ...tool }) => ({
                            name: tool.name,
                            description: tool.description,
                            inputSchema: tool.inputSchema,
                        }))
                    }
                };
                ws.send(JSON.stringify(response));
            } else if (message.method === 'tools/call') {
                const { name: toolName, arguments: args } = message.params;
                
                const tool = tools.find((t) => t.name === toolName);
                if (!tool) {
                    const errorResponse = {
                        jsonrpc: '2.0',
                        id: message.id,
                        error: {
                            code: -32601,
                            message: `Unknown tool: ${toolName}`
                        }
                    };
                    ws.send(JSON.stringify(errorResponse));
                    return;
                }
                
                try {
                    const result = await tool.handler(args || {});
                    const response = {
                        jsonrpc: '2.0',
                        id: message.id,
                        result: {
                            content: [
                                {
                                    type: "text",
                                    text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                                }
                            ]
                        }
                    };
                    ws.send(JSON.stringify(response));
                } catch (error) {
                    const errorResponse = {
                        jsonrpc: '2.0',
                        id: message.id,
                        error: {
                            code: -32603,
                            message: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
                        }
                    };
                    ws.send(JSON.stringify(errorResponse));
                }
            }
        } catch (error) {
            console.error('❌ Error processing WebSocket message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 MCP WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// MCP WebSocket info endpoint
app.get('/mcp', (req, res) => {
    res.json({ 
        message: 'MCP WebSocket endpoint available',
        websocket_url: `ws://localhost:${port}/mcp`,
        available_endpoints: {
            health: '/health',
            tools: '/tools',
            execute: '/tools/:toolName',
            websocket: '/mcp (WebSocket)'
        }
    });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        available_endpoints: {
            health: 'GET /health',
            tools: 'GET /tools', 
            execute: 'POST /tools/:toolName'
        }
    });
});

// Start server
httpServer.listen(port, () => {
    console.log(`🚀 Evolution API MCP Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🛠️  Tools list: http://localhost:${port}/tools`);
    console.log(`⚡ Execute tool: POST http://localhost:${port}/tools/:toolName`);
    console.log(`🔌 WebSocket MCP: ws://localhost:${port}/mcp`);
    
    // Log environment info
    console.log(`🌍 Evolution API URL: ${process.env.EVOLUTION_API_URL || 'Not configured'}`);
    console.log(`🔑 Evolution API Key: ${process.env.EVOLUTION_API_KEY ? '***configured***' : 'Not configured'}`);
});

export default app;