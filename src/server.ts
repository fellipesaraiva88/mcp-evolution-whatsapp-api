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
    const { name, arguments: args } = request.params;
    
    const tool = tools.find(t => t.name === name);
    if (!tool) {
        throw new Error(`Tool ${name} not found`);
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

// List available tools
app.get('/tools', async (req, res) => {
    try {
        const toolsList = tools.map(({ handler, ...tool }) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        }));
        res.json(toolsList);
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to list tools',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});

// Execute a specific tool
app.post('/tools/:toolName', async (req, res) => {
    try {
        const { toolName } = req.params;
        const args = req.body || {};
        
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
            return res.status(404).json({ 
                error: 'Tool not found',
                available_tools: tools.map(t => t.name)
            });
        }
        
        const result = await tool.handler(args);
        res.json({
            tool: toolName,
            result: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Tool execution error:`, error);
        res.status(500).json({ 
            error: 'Tool execution failed',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});

// WebSocket MCP Server
const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/mcp'
});

wss.on('connection', (ws) => {
    console.log('🔌 New MCP WebSocket connection established');
    
    let initialized = false;
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📨 Received MCP message:', message);
            
            // Handle MCP protocol messages
            if (message.method === 'initialize') {
                initialized = true;
                const response = {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {
                                listChanged: false
                            }
                        },
                        serverInfo: {
                            name: 'Evolution API MCP Server',
                            version: '0.1.0'
                        }
                    }
                };
                ws.send(JSON.stringify(response));
                console.log('✅ MCP initialization complete');
                return;
            }
            
            if (!initialized) {
                const errorResponse = {
                    jsonrpc: '2.0',
                    id: message.id,
                    error: {
                        code: -32002,
                        message: 'Server not initialized. Send initialize request first.'
                    }
                };
                ws.send(JSON.stringify(errorResponse));
                return;
            }
            
            if (message.method === 'tools/list') {
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
                console.log(`📋 Sent ${tools.length} tools to client`);
                return;
            }
            
            if (message.method === 'tools/call') {
                const { name, arguments: args } = message.params;
                
                const tool = tools.find(t => t.name === name);
                if (!tool) {
                    const errorResponse = {
                        jsonrpc: '2.0',
                        id: message.id,
                        error: {
                            code: -32601,
                            message: `Tool ${name} not found`
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
                    console.log(`⚡ Executed tool: ${name}`);
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
                    console.error(`❌ Tool execution error:`, error);
                }
                return;
            }
            
            // Unknown method
            const errorResponse = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                    code: -32601,
                    message: `Method not found: ${message.method}`
                }
            };
            ws.send(JSON.stringify(errorResponse));
            
        } catch (error) {
            console.error('❌ WebSocket message processing error:', error);
            const errorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32700,
                    message: 'Parse error'
                }
            };
            ws.send(JSON.stringify(errorResponse));
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 MCP WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// MCP endpoint info
app.get('/mcp', (req, res) => {
    res.json({
        message: 'MCP WebSocket server is available',
        websocket_url: `ws://${req.get('host')}/mcp`,
        protocol: 'Model Context Protocol (MCP)',
        version: '2024-11-05',
        endpoints: {
            health: '/health',
            tools: '/tools',
            execute_tool: '/tools/:toolName'
        },
        instructions: {
            connect: 'Connect to the WebSocket URL above',
            initialize: 'Send an initialize message first',
            list_tools: 'Use tools/list method',
            call_tool: 'Use tools/call method with tool name and arguments'
        }
    });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        available_endpoints: ['/health', '/tools', '/tools/:toolName', '/mcp'],
        message: `Endpoint ${req.path} not found`
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