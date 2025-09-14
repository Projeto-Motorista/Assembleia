const fastify = require('fastify')({ 
  logger: true,
  disableRequestLogging: false
});

// CORS simples
fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

// OPTIONS para todas as rotas
fastify.options('*', async (request, reply) => {
  reply.status(200).send();
});

// Endpoint raiz
fastify.get('/', async (request, reply) => {
  return {
    message: 'Igreja Backend - Novo',
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
});

// Login endpoint
fastify.post('/api/auth/login', async (request, reply) => {
  const body = request.body || {};
  const { email, password } = body;

  console.log('Login attempt:', { email, password });

  if (email === 'admin@igreja.com' && password === 'Admin123!') {
    const response = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE1MTYyMzkwMjJ9.fake-token',
      user: {
        id: 1,
        name: 'Administrador',
        email: 'admin@igreja.com',
        role: 'admin'
      }
    };
    console.log('Login successful:', response);
    return response;
  }

  console.log('Login failed - invalid credentials');
  reply.status(401);
  return { error: 'Credenciais inválidas' };
});

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log('='.repeat(50));
    console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
    console.log(`📍 Host: ${host}`);
    console.log(`🔌 Porta: ${port}`);
    console.log(`🌐 URL: http://${host}:${port}`);
    console.log(`❤️ Health: http://${host}:${port}/health`);
    console.log(`🔐 Login: http://${host}:${port}/api/auth/login`);
    console.log('='.repeat(50));
    
  } catch (err) {
    console.error('❌ ERRO AO INICIAR SERVIDOR:', err);
    process.exit(1);
  }
};

// Capturar erros não tratados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

start();
