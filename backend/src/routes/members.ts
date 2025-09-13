import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const memberSchema = z.object({
  name: z.string().min(3),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const memberRoutes: FastifyPluginAsync = async (app) => {
  // Listar todos os membros
  app.get('/',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      try {
        const { page = 1, limit = 20, search = '' } = request.query as any;
        const skip = (page - 1) * limit;

        const where = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {};

        const [members, total] = await Promise.all([
          prisma.member.findMany({
            where: where as any,
            skip,
            take: Number(limit),
            orderBy: { name: 'asc' },
            include: {
              _count: {
                select: { contributions: true },
              },
            },
          }),
          prisma.member.count({ where: where as any }),
        ]);

        return reply.send({
          members,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar membros' });
      }
    }
  );

  // Buscar membro por ID
  app.get('/:id',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;

        const member = await prisma.member.findUnique({
          where: { id },
          include: {
            contributions: {
              orderBy: { date: 'desc' },
              take: 10,
              include: {
                category: true,
              },
            },
            _count: {
              select: { contributions: true },
            },
          },
        });

        if (!member) {
          return reply.status(404).send({ error: 'Membro não encontrado' });
        }

        // Calcular total de contribuições
        const totalContributions = await prisma.contribution.aggregate({
          where: { memberId: id },
          _sum: { amount: true },
        });

        return reply.send({
          ...member,
          totalContributed: totalContributions._sum.amount || 0,
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar membro' });
      }
    }
  );

  // Criar novo membro
  app.post('/',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      try {
        const data = memberSchema.parse(request.body);

        // Verificar email duplicado
        if (data.email) {
          const existing = await prisma.member.findUnique({
            where: { email: data.email },
          });
          if (existing) {
            return reply.status(400).send({ error: 'Email já cadastrado' });
          }
        }

        const member = await prisma.member.create({
          data: {
            ...data,
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
          },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'CREATE_MEMBER',
            entity: 'member',
            entityId: member.id,
            details: JSON.stringify({ name: member.name, email: member.email ?? undefined }),
          },
        });

        return reply.status(201).send(member);
      } catch (error) {
        app.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        return reply.status(500).send({ error: 'Erro ao criar membro' });
      }
    }
  );

  // Atualizar membro
  app.put('/:id',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const data = memberSchema.parse(request.body);

        // Verificar se membro existe
        const existing = await prisma.member.findUnique({
          where: { id },
        });

        if (!existing) {
          return reply.status(404).send({ error: 'Membro não encontrado' });
        }

        // Verificar email duplicado
        if (data.email && data.email !== existing.email) {
          const emailExists = await prisma.member.findUnique({
            where: { email: data.email },
          });
          if (emailExists) {
            return reply.status(400).send({ error: 'Email já cadastrado' });
          }
        }

        const member = await prisma.member.update({
          where: { id },
          data: {
            ...data,
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
          },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'UPDATE_MEMBER',
            entity: 'member',
            entityId: member.id,
            details: JSON.stringify(data),
          },
        });

        return reply.send(member);
      } catch (error) {
        app.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        return reply.status(500).send({ error: 'Erro ao atualizar membro' });
      }
    }
  );

  // Deletar membro
  app.delete('/:id',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;

        // Verificar se é admin
        if (request.user.role !== 'ADMIN') {
          return reply.status(403).send({ error: 'Sem permissão para deletar membros' });
        }

        const member = await prisma.member.findUnique({
          where: { id },
        });

        if (!member) {
          return reply.status(404).send({ error: 'Membro não encontrado' });
        }

        // Soft delete - apenas desativa
        await prisma.member.update({
          where: { id },
          data: { active: false },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'DELETE_MEMBER',
            entity: 'member',
            entityId: id,
            details: JSON.stringify({ name: member.name }),
          },
        });

        return reply.send({ message: 'Membro removido com sucesso' });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao deletar membro' });
      }
    }
  );

  // Alterar status ativo/inativo
  app.patch('/:id/active',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const bodySchema = z.object({ active: z.boolean() });
        const { active } = bodySchema.parse(request.body);

        const existing = await prisma.member.findUnique({ where: { id } });
        if (!existing) {
          return reply.status(404).send({ error: 'Membro não encontrado' });
        }

        const member = await prisma.member.update({
          where: { id },
          data: { active },
        });

        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: active ? 'ACTIVATE_MEMBER' : 'DEACTIVATE_MEMBER',
            entity: 'member',
            entityId: id,
          },
        });

        return reply.send({ id: member.id, active: member.active });
      } catch (error) {
        app.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        return reply.status(500).send({ error: 'Erro ao alterar status do membro' });
      }
    }
  );

  // Upload foto do membro
  app.post('/:id/photo',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({ error: 'Nenhuma imagem enviada' });
        }

        // Verificar tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(data.mimetype)) {
          return reply.status(400).send({ error: 'Tipo de arquivo não permitido' });
        }

        // Salvar arquivo
        const filename = `member_${id}_${Date.now()}.${data.mimetype.split('/')[1]}`;
        const path = `./uploads/members/${filename}`;
        
        // Aqui você salvaria o arquivo no sistema ou cloud storage
        // Por enquanto, apenas retornamos o path simulado

        const member = await prisma.member.update({
          where: { id },
          data: { profilePhoto: `/uploads/members/${filename}` },
        });

        return reply.send({ photoUrl: member.profilePhoto });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao fazer upload da foto' });
      }
    }
  );
};
