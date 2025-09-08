#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { createTools } from "./tools";

const app = express();
const port = process.env.PORT || 3000;

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

// MCP WebSocket endpoint (for future MCP over WebSocket support)
app.get('/mcp', (req, res) => {
    res.json({ 
        message: 'MCP WebSocket endpoint not implemented yet',
        available_endpoints: {
            health: '/health',
            tools: '/tools',
            execute: '/tools/:toolName'
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
app.listen(port, () => {
    console.log(`🚀 Evolution API MCP Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🛠️  Tools list: http://localhost:${port}/tools`);
    console.log(`⚡ Execute tool: POST http://localhost:${port}/tools/:toolName`);
    
    // Log environment info
    console.log(`🌍 Evolution API URL: ${process.env.EVOLUTION_API_URL || 'Not configured'}`);
    console.log(`🔑 Evolution API Key: ${process.env.EVOLUTION_API_KEY ? '***configured***' : 'Not configured'}`);
});

export default app;