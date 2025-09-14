const fastify = require('fastify')({ logger: true });

// CORS
fastify.addHook('preHandler', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
    return;
  }
});

// Root
fastify.get('/', async () => {
  return { 
    message: 'Igreja Backend API', 
    status: 'running', 
    version: 'minimal-js',
    timestamp: new Date().toISOString()
  };
});

// Health
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Login
fastify.post('/api/auth/login', async (request, reply) => {
  const { email, password } = request.body;
  
  if (email === 'admin@igreja.com' && password === 'Admin123!') {
    return {
      token: 'fake-jwt-token-for-testing',
      user: {
        id: 1,
        name: 'Administrador',
        email: 'admin@igreja.com',
        role: 'admin'
      }
    };
  }
  
  return reply.status(401).send({ error: 'Credenciais inválidas' });
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 JS server running on port ${port}`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();
