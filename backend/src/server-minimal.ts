import 'dotenv/config';
import Fastify from 'fastify';

const app = Fastify({
  logger: true,
});

// CORS simples
app.addHook('preHandler', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
    return;
  }
});

// Endpoints básicos
app.get('/', async () => {
  return { message: 'Igreja Backend API', status: 'running', version: 'minimal' };
});

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Login básico sem banco
app.post('/api/auth/login', async (request, reply) => {
  const { email, password } = request.body as any;
  
  // Validação simples
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

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Minimal server running on port ${port}`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();
