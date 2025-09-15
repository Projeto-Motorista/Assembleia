import 'dotenv/config';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth';
import { memberRoutes } from './routes/members';
import { contributionRoutes } from './routes/contributions';
import { categoryRoutes } from './routes/categories';
import { reportRoutes } from './routes/reports';
import { dashboardRoutes } from './routes/dashboard';
import { uploadRoutes } from './routes/upload';
import { eventRoutes } from './routes/events';

const app = Fastify({
  logger: true,
});

// CORS manual - mais controle
app.addHook('preHandler', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
    return;
  }
});

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'default-secret-change-this',
});

app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Servir arquivos estáticos (uploads) - comentado temporariamente
// const uploadsPath = path.join(__dirname, '..', 'uploads');
// if (!fs.existsSync(uploadsPath)) {
//   fs.mkdirSync(uploadsPath, { recursive: true });
// }
// app.register(fastifyStatic, {
//   root: uploadsPath,
//   prefix: '/uploads/',
// });

// Decorator para validar autenticação
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Não autorizado' });
  }
});

// Rotas
app.register(authRoutes, { prefix: '/api/auth' });
app.register(memberRoutes, { prefix: '/api/members' });
app.register(contributionRoutes, { prefix: '/api/contributions' });
app.register(categoryRoutes, { prefix: '/api/categories' });
app.register(reportRoutes, { prefix: '/api/reports' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });
app.register(uploadRoutes, { prefix: '/api/upload' });
app.register(eventRoutes, { prefix: '/api/events' });

// Root endpoint
app.get('/', async () => {
  return { message: 'Igreja Backend API', status: 'running', timestamp: new Date().toISOString() };
});

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Criar usuário admin se não existir
const createAdminUser = async () => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const bcrypt = await import('bcryptjs');
    const prisma = new PrismaClient();
    
    console.log('🔍 Checking for admin user...');
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@igreja.com' }
    });
    
    if (!existingAdmin) {
      console.log('👤 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@igreja.com',
          password: hashedPassword,
          name: 'Administrador',
          role: 'ADMIN'
        }
      });
      console.log('✅ Admin user created successfully:', newAdmin.email);
      console.log('🔑 Login: admin@igreja.com / admin123');
    } else {
      console.log('✅ Admin user already exists:', existingAdmin.email);
    }
    
    // Verificar total de usuários
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    const host = '0.0.0.0';
    
    await app.listen({ port, host });
    
    console.log(`🚀 Server running on ${host}:${port}`);
    console.log(`📍 Health check: http://${host}:${port}/health`);
    console.log(`🔗 API endpoints: http://${host}:${port}/api/*`);
    
    // Criar admin user após servidor iniciar
    await createAdminUser();
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    app.log.error(err);
    process.exit(1);
  }
};

start();
