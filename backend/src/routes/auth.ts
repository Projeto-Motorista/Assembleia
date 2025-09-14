import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(3),
  role: z.enum(['ADMIN', 'MODERATOR', 'VIEWER']).default('ADMIN'),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Login
  app.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Credenciais inválidas' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Credenciais inválidas' });
      }

      const token = app.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: '7d' }
      );

      // Criar sessão
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Log de atividade
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'user',
          entityId: user.id,
        },
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      return reply.status(500).send({ error: 'Erro ao fazer login' });
    }
  });

  // Registro (apenas para admins)
  app.post('/register', 
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        // Verificar se usuário é admin
        if (request.user.role !== 'ADMIN') {
          return reply.status(403).send({ error: 'Sem permissão para criar usuários' });
        }

        const { email, password, name, role } = registerSchema.parse(request.body);

        // Verificar se email já existe
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return reply.status(400).send({ error: 'Email já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role,
          },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'CREATE_USER',
            entity: 'user',
            entityId: user.id,
            details: JSON.stringify({ email, name, role }),
          },
        });

        return reply.status(201).send({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        });
      } catch (error) {
        app.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        return reply.status(500).send({ error: 'Erro ao criar usuário' });
      }
    }
  );

  // Logout
  app.post('/logout',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
          await prisma.session.deleteMany({
            where: { token },
          });
        }

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'LOGOUT',
            entity: 'user',
            entityId: request.user.id,
          },
        });

        return reply.send({ message: 'Logout realizado com sucesso' });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao fazer logout' });
      }
    }
  );

  // Verificar token
  app.get('/me',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: request.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
          },
        });

        if (!user || !user.active) {
          return reply.status(401).send({ error: 'Usuário não encontrado ou inativo' });
        }

        return reply.send({ user });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar usuário' });
      }
    }
  );

  // Alterar senha
  app.patch('/change-password',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const schema = z.object({
          currentPassword: z.string(),
          newPassword: z.string().min(6),
        });

        const { currentPassword, newPassword } = schema.parse(request.body);

        const user = await prisma.user.findUnique({
          where: { id: request.user.id },
        });

        if (!user) {
          return reply.status(404).send({ error: 'Usuário não encontrado' });
        }

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
          return reply.status(401).send({ error: 'Senha atual incorreta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'CHANGE_PASSWORD',
            entity: 'user',
            entityId: user.id,
          },
        });

        return reply.send({ message: 'Senha alterada com sucesso' });
      } catch (error) {
        app.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        return reply.status(500).send({ error: 'Erro ao alterar senha' });
      }
    }
  );
};
