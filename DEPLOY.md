# MCP Evolution WhatsApp API - Deploy Guide

## Visão Geral
Este projeto disponibiliza o MCP Evolution WhatsApp API tanto como um servidor MCP tradicional (via stdio) quanto como uma REST API HTTP.

## Configuração

### 1. Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```
EVOLUTION_API_URL=https://sua-evolution-api.com/
EVOLUTION_API_KEY=SUA_CHAVE_API
```

### 2. Instalação de Dependências
```bash
npm install
```

## Execução

### Modo MCP (stdio)
Para uso com clientes MCP tradicionais:
```bash
npm run build
npm start
```

### Modo HTTP Server
Para disponibilizar via REST API:

#### Desenvolvimento
```bash
npm run dev:server
```

#### Produção
```bash
npm run build:server
npm run start:server
```

O servidor HTTP será iniciado na porta 3000.

## Endpoints HTTP

### Health Check
```
GET http://localhost:3000/health
```

### Listar Tools
```
GET http://localhost:3000/tools
```

### Executar Tool
```
POST http://localhost:3000/tools/{toolName}
Content-Type: application/json

{
  "param1": "value1",
  "param2": "value2"
}
```

## Exemplos de Uso

### Criar Instância Evolution
```bash
curl -X POST http://localhost:3000/tools/create_evolution_instance \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "minha-instancia",
    "number": "5511999999999",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS",
    "alwaysOnline": true,
    "readMessages": true
  }'
```

### Enviar Mensagem de Texto
```bash
curl -X POST http://localhost:3000/tools/send_plain_text \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "minha-instancia",
    "number": "5511999999999",
    "text": "Olá! Esta é uma mensagem de teste via MCP HTTP API."
  }'
```

### Listar Instâncias
```bash
curl http://localhost:3000/tools/fetch_evolution_instances
```

## Deploy em Produção

### Usando Docker
```bash
# Build da imagem
docker build -t mcp-evolution-api .

# Executar container
docker run -d \
  --name mcp-evolution-api \
  -p 3000:3000 \
  -e EVOLUTION_API_URL="https://sua-evolution-api.com/" \
  -e EVOLUTION_API_KEY="SUA_CHAVE_API" \
  mcp-evolution-api
```

### Usando Docker Compose
```bash
docker-compose up -d
```

### Deploy Manual
```bash
# Clone o repositório
git clone <repository-url>
cd mcp-evolution-whatsapp-api

# Instalar dependências
npm install

# Build do projeto
npm run build:server

# Configurar variáveis de ambiente
export EVOLUTION_API_URL="https://sua-evolution-api.com/"
export EVOLUTION_API_KEY="SUA_CHAVE_API"

# Iniciar servidor
npm run start:server
```

## Configuração de Proxy Reverso

### Nginx
```nginx
server {
    listen 80;
    server_name sua-api.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoramento

### Verificar Status
```bash
curl http://localhost:3000/health
```

### Logs
O servidor registra todas as requisições e erros no console.

## Troubleshooting

### Servidor não inicia
- Verifique se a porta 3000 está disponível
- Confirme se as variáveis de ambiente estão configuradas
- Verifique os logs de erro

### Evolution API não responde
- Confirme se a `EVOLUTION_API_URL` está correta
- Verifique se a `EVOLUTION_API_KEY` é válida
- Teste a conectividade com a Evolution API diretamente

### Erros de CORS
- O servidor já inclui configuração básica de CORS
- Para ambientes específicos, modifique o arquivo `src/server.ts`

## Funcionalidades Disponíveis

O servidor HTTP expõe todas as funcionalidades do MCP Evolution WhatsApp API:

- ✅ Gerenciamento de instâncias (criar, conectar, desconectar, excluir)
- ✅ Envio de mensagens (texto, mídia, áudio, sticker, localização)
- ✅ Mensagens interativas (botões, listas, enquetes)
- ✅ Gerenciamento de grupos e contatos
- ✅ Configuração de webhooks e settings
- ✅ Status e presença

## Licença
MIT License