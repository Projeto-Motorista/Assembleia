const http = require('http');
const url = require('url');

console.log('🚀 Iniciando servidor HTTP nativo...');

const server = http.createServer((req, res) => {
  console.log(`📍 ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Root endpoint
  if (path === '/' && req.method === 'GET') {
    console.log('✅ Root endpoint');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Igreja Backend HTTP',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '3.0.0'
    }));
    return;
  }
  
  // Health endpoint
  if (path === '/health' && req.method === 'GET') {
    console.log('❤️ Health endpoint');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Login endpoint
  if (path === '/api/auth/login' && req.method === 'POST') {
    console.log('🔐 Login endpoint');
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { email, password } = data;
        
        console.log('Login data:', { email, password });
        
        if (email === 'admin@igreja.com' && password === 'Admin123!') {
          console.log('✅ Login success');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            token: 'http-jwt-token-123',
            user: {
              id: 1,
              name: 'Administrador',
              email: 'admin@igreja.com',
              role: 'admin'
            }
          }));
        } else {
          console.log('❌ Login failed');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Credenciais inválidas' }));
        }
      } catch (err) {
        console.error('❌ JSON parse error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // 404
  console.log('❌ 404 Not Found');
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

console.log(`🔍 PORT env: ${process.env.PORT}`);
console.log(`🔍 Porta final: ${port}`);
console.log(`🔍 Host: ${host}`);

server.listen(port, host, () => {
  console.log('='.repeat(60));
  console.log('🎉 SERVIDOR HTTP NATIVO RODANDO!');
  console.log(`🌐 Porta: ${port}`);
  console.log(`📍 Host: ${host}`);
  console.log(`🔗 URL: http://${host}:${port}`);
  console.log(`🌍 Railway URL: https://assembleia-de-deus-backend-production.up.railway.app`);
  console.log('='.repeat(60));
}).on('listening', () => {
  console.log('✅ Servidor está escutando na porta correta!');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${port} já está em uso!`);
  } else if (err.code === 'EACCES') {
    console.error(`❌ Sem permissão para usar porta ${port}!`);
  } else {
    console.error('❌ Erro ao iniciar servidor:', err);
  }
  process.exit(1);
});

server.on('error', (err) => {
  console.error('💥 ERRO SERVIDOR:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});
