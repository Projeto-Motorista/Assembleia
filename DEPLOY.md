# Guia de Deploy no Render

## Visão Geral

Este documento descreve o processo de deploy da aplicação Dízimos no Render.com, uma plataforma de hospedagem na nuvem que oferece serviços gratuitos para projetos pequenos.

## Pré-requisitos

1. Uma conta no [Render](https://render.com/)
2. Repositório Git com o código da aplicação

## Configuração do Projeto

### Arquivo render.yaml

O arquivo `render.yaml` na raiz do projeto contém as configurações necessárias para o deploy no Render. Este arquivo define:

- Serviços web para o backend e frontend
- Configurações de ambiente
- Comandos de build e start
- Verificação de saúde do serviço

### Configuração do Frontend (Mobile)

O arquivo `api.ts` no projeto mobile foi configurado para detectar automaticamente o ambiente e usar a URL correta do backend:

- Em desenvolvimento: `http://localhost:3333/api`
- Em produção: `https://dizimos-backend.onrender.com/api`

### Configuração do Frontend (Web)

O arquivo `next.config.js` no projeto web foi configurado para usar a URL correta do backend através da variável de ambiente:

```javascript
env: {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://assembleia-de-deus-production.up.railway.app',
},
```

No ambiente de produção do Render, esta variável será definida como `https://dizimos-backend.onrender.com`.

## Processo de Deploy

### Backend e Frontend Web

1. Faça login no [Dashboard do Render](https://dashboard.render.com/)
2. Clique em "New" e selecione "Blueprint"
3. Conecte seu repositório Git
4. O Render detectará automaticamente o arquivo `render.yaml` e configurará os serviços de backend e frontend
5. Revise as configurações e clique em "Apply"
6. O deploy será iniciado automaticamente para ambos os serviços

### Verificação do Deploy

Após o deploy, você pode verificar se os serviços estão funcionando corretamente:

**Backend:**
```
https://dizimos-backend.onrender.com/health
```
Você deve receber uma resposta JSON com status "ok".

**Frontend Web:**
```
https://dizimos-web.onrender.com
```
Você deve ver a interface web da aplicação.

## Variáveis de Ambiente

As seguintes variáveis de ambiente são configuradas no arquivo `render.yaml`:

**Backend:**
- `NODE_ENV`: Define o ambiente como "production"
- `PORT`: Define a porta do servidor como 3333

**Frontend Web:**
- `NODE_ENV`: Define o ambiente como "production"
- `PORT`: Define a porta do servidor como 3000
- `NEXT_PUBLIC_API_URL`: Define a URL da API do backend como "https://dizimos-backend.onrender.com"

Se precisar adicionar mais variáveis de ambiente (como chaves de API ou credenciais de banco de dados), você pode adicioná-las no arquivo `render.yaml` ou diretamente no dashboard do Render.

## Solução de Problemas

Se encontrar problemas durante o deploy:

1. Verifique os logs do serviço no dashboard do Render
2. Certifique-se de que o comando de start está correto
3. Verifique se o healthcheck está respondendo corretamente

## Atualizações

O Render está configurado para fazer deploy automático quando houver novos commits no branch principal do repositório. Se você precisar desativar esse comportamento, altere `autoDeploy: true` para `autoDeploy: false` no arquivo `render.yaml`.