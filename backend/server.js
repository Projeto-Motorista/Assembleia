console.log('🚀 Iniciando servidor...');

const fastify = require('fastify')({ 
  logger: {
    level: 'info'
  }
});

console.log('✅ Fastify criado');

// CORS
fastify.addHook('preHandler', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    reply.status(200).send();
    return;
  }
});

console.log('✅ CORS configurado');

// Root
fastify.get('/', async () => {
  console.log('📍 Root endpoint chamado');
  return { 
    message: 'Igreja Backend API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  };
});

// Health
fastify.get('/health', async () => {
  console.log('❤️ Health endpoint chamado');
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  };
});

// Login
fastify.post('/api/auth/login', async (request, reply) => {
  console.log('🔐 Login endpoint chamado');
  console.log('Body recebido:', request.body);
  
  const { email, password } = request.body || {};
  
  if (email === 'admin@igreja.com' && password === 'Admin123!') {
    console.log('✅ Login bem-sucedido');
    return {
      token: 'fake-jwt-token-123',
      user: {
        id: 1,
        name: 'Administrador',
        email: 'admin@igreja.com',
        role: 'admin'
      }
    };
  }
  
  console.log('❌ Login falhou');
  reply.status(401);
  return { error: 'Credenciais inválidas' };
});

console.log('✅ Rotas configuradas');

// Start
const start = async () => {
  try {
    const port = process.env.PORT || 8080;
    console.log(`🔌 Tentando iniciar na porta: ${port}`);
    
    await fastify.listen({ 
      port: Number(port), 
      host: '0.0.0.0' 
    });
    
    console.log('='.repeat(60));
    console.log('🎉 SERVIDOR RODANDO COM SUCESSO!');
    console.log(`🌐 Porta: ${port}`);
    console.log(`📍 Host: 0.0.0.0`);
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error('💥 ERRO FATAL:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

console.log('🚀 Chamando start()...');
start();
