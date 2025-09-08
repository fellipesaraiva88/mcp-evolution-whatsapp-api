# Publicando no Smithery

## Como disponibilizar o MCP Evolution WhatsApp API no Smithery

O Smithery é o registro oficial de servidores MCP, permitindo que mais de 10.000 usuários descobram e instalem seu servidor facilmente.

## 📋 Pré-requisitos

1. **Repositório no GitHub** - Seu código deve estar em um repositório público no GitHub
2. **Arquivo smithery.yaml** - ✅ Já configurado neste projeto
3. **Build funcionando** - ✅ Já testado e funcionando
4. **Documentação adequada** - ✅ README.md atualizado

## 🚀 Processo de Publicação

### 1. Preparar o Repositório

Certifique-se de que seu repositório GitHub tenha:
- [ ] Código fonte completo
- [ ] README.md com instruções claras
- [ ] smithery.yaml configurado
- [ ] LICENSE (já existe)
- [ ] .gitignore adequado

### 2. Acessar o Smithery

1. Acesse: https://smithery.ai/new
2. Clique em "Continue with GitHub"
3. Autorize as permissões necessárias do GitHub

### 3. Submeter o Servidor

1. No painel do Smithery, clique em "Add Server"
2. Selecione seu repositório GitHub
3. O Smithery automaticamente detectará o `smithery.yaml`
4. Revise as configurações detectadas
5. Clique em "Deploy"

### 4. Aguardar Aprovação

- O Smithery fará verificações automáticas
- Se tudo estiver correto, será aprovado automaticamente
- Em caso de problemas, você receberá feedback

## 📝 Configuração Atual do smithery.yaml

O arquivo já está configurado corretamente:

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      EVOLUTION_API_URL:
        type: string
        description: "URL of the Evolution API"
      EVOLUTION_API_KEY:
        type: string
        description: "API Key for Evolution API"
    required: ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"]
  commandFunction: |-
    (config) => ({
      command: "bun",
      args: [
        "run",
        "dist/main.js"
      ],
      env: {
        EVOLUTION_API_URL: config.EVOLUTION_API_URL,
        EVOLUTION_API_KEY: config.EVOLUTION_API_KEY
      }
    })
```

## 🎯 Após a Publicação

### Instalação pelos Usuários

Os usuários poderão instalar facilmente usando:

```bash
# Instalação básica
npx @smithery/cli install mcp-evolution-whatsapp-api --client claude

# Instalação com configuração
npx @smithery/cli install mcp-evolution-whatsapp-api --client claude --config '{
  "EVOLUTION_API_URL": "https://sua-api.com/",
  "EVOLUTION_API_KEY": "sua-chave-aqui"
}'
```

### Benefícios

1. **Descoberta**: Seu servidor aparecerá no registro público
2. **Facilidade**: Instalação com um comando
3. **Distribuição**: Acesso a milhares de usuários
4. **Versionamento**: Sistema automático de versões
5. **Hospedagem**: O Smithery pode hospedar seu servidor

## 🔧 Troubleshooting

### Problemas Comuns

**Erro: "Repository not found"**
- Verifique se o repositório é público
- Confirme as permissões do GitHub

**Erro: "Build failed"**
- Execute `npm run build` localmente para testar
- Verifique se todas as dependências estão no package.json

**Erro: "Invalid smithery.yaml"**
- Valide a sintaxe YAML
- Confirme que todos os campos obrigatórios estão presentes

### Logs e Debugging

O Smithery fornece logs detalhados do processo de build e deploy. Monitore-os para identificar problemas.

## 🌟 Dicas para Sucesso

1. **README claro**: Inclua exemplos de uso
2. **Testes**: Garanta que tudo funciona antes de submeter
3. **Descrição detalhada**: Explique o que seu servidor faz
4. **Tags apropriadas**: Use tags relevantes para descoberta
5. **Manutenção**: Mantenha o servidor atualizado

## 📞 Suporte

- **Documentação**: https://smithery.ai/docs
- **Status**: https://smithery.ai/status
- **GitHub Issues**: Para problemas específicos do seu servidor

---

**Pronto para publicar!** 🚀 

Seu MCP Evolution WhatsApp API está preparado para ser disponibilizado no Smithery e alcançar milhares de usuários!