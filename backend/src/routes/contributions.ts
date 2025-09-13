import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const contributionSchema = z.object({
  memberId: z.string().uuid(),
  categoryId: z.string().uuid(),
  type: z.enum(['DIZIMO', 'OFERTA', 'OFERTA_MISSIONARIA', 'EVENTO_ESPECIAL', 'DOACAO_ESPECIAL', 'OUTROS']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'TRANSFERENCIA', 'CHEQUE', 'BOLETO']),
  date: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const contributionRoutes: FastifyPluginAsync = async (app) => {
  // Listar contribuições
  app.get('/',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { 
          page = 1, 
          limit = 20, 
          memberId,
          categoryId,
          type,
          startDate,
          endDate,
          verified
        } = request.query as any;
        
        const skip = (page - 1) * limit;

        const where: any = {};
        if (memberId) where.memberId = memberId;
        if (categoryId) where.categoryId = categoryId;
        if (type) where.type = type;
        if (verified !== undefined) where.verified = verified === 'true';
        
        if (startDate || endDate) {
          where.date = {};
          if (startDate) where.date.gte = new Date(startDate);
          if (endDate) where.date.lte = new Date(endDate);
        }

        const [contributions, total] = await Promise.all([
          prisma.contribution.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy: { date: 'desc' },
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              category: true,
            },
          }),
          prisma.contribution.count({ where }),
        ]);

        const totalAmount = await prisma.contribution.aggregate({
          where,
          _sum: { amount: true },
        });

        return reply.send({
          contributions,
          totalAmount: totalAmount._sum.amount || 0,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar contribuições' });
      }
    }
  );

  // Buscar contribuição por ID
  app.get('/:id',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;

        const contribution = await prisma.contribution.findUnique({
          where: { id },
          include: {
            member: true,
            category: true,
          },
        });

        if (!contribution) {
          return reply.status(404).send({ error: 'Contribuição não encontrada' });
        }

        return reply.send(contribution);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar contribuição' });
      }
    }
  );

  // Criar nova contribuição
  app.post('/',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const data = contributionSchema.parse(request.body);

        // Verificar se membro existe
        const member = await prisma.member.findUnique({
          where: { id: data.memberId },
        });

        if (!member) {
          return reply.status(404).send({ error: 'Membro não encontrado' });
        }

        // Verificar se categoria existe
        const category = await prisma.category.findUnique({
          where: { id: data.categoryId },
        });

        if (!category) {
          return reply.status(404).send({ error: 'Categoria não encontrada' });
        }

        const contribution = await prisma.contribution.create({
          data: {
            ...data,
            date: data.date ? new Date(data.date) : new Date(),
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            category: true,
          },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'CREATE_CONTRIBUTION',
            entity: 'contribution',
            entityId: contribution.id,
            details: {
              memberId: data.memberId,
              amount: data.amount,
              type: data.type,
            },
          },
        });

        return reply.status(201).send(contribution);
      } catch (error) {
        app.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        return reply.status(500).send({ error: 'Erro ao criar contribuição' });
      }
    }
  );

  // Atualizar contribuição
  app.put('/:id',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const data = contributionSchema.parse(request.body);

        const existing = await prisma.contribution.findUnique({
          where: { id },
        });

        if (!existing) {
          return reply.status(404).send({ error: 'Contribuição não encontrada' });
        }

        const contribution = await prisma.contribution.update({
          where: { id },
          data: {
            ...data,
            date: data.date ? new Date(data.date) : undefined,
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            category: true,
          },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'UPDATE_CONTRIBUTION',
            entity: 'contribution',
            entityId: id,
            details: data,
          },
        });

        return reply.send(contribution);
      } catch (error) {
        app.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        return reply.status(500).send({ error: 'Erro ao atualizar contribuição' });
      }
    }
  );

  // Deletar contribuição
  app.delete('/:id',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;

        // Verificar se é admin
        if (request.user.role !== 'ADMIN') {
          return reply.status(403).send({ error: 'Sem permissão para deletar contribuições' });
        }

        const contribution = await prisma.contribution.findUnique({
          where: { id },
        });

        if (!contribution) {
          return reply.status(404).send({ error: 'Contribuição não encontrada' });
        }

        await prisma.contribution.delete({
          where: { id },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: 'DELETE_CONTRIBUTION',
            entity: 'contribution',
            entityId: id,
            details: { amount: contribution.amount },
          },
        });

        return reply.send({ message: 'Contribuição removida com sucesso' });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao deletar contribuição' });
      }
    }
  );

  // Upload de comprovante
  app.post('/:id/receipt',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
        }

        // Verificar tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(data.mimetype)) {
          return reply.status(400).send({ error: 'Tipo de arquivo não permitido' });
        }

        // Salvar arquivo
        const ext = data.mimetype === 'application/pdf' ? 'pdf' : data.mimetype.split('/')[1];
        const filename = `receipt_${id}_${Date.now()}.${ext}`;
        const path = `./uploads/receipts/${filename}`;
        
        // Aqui você salvaria o arquivo no sistema ou cloud storage

        const contribution = await prisma.contribution.update({
          where: { id },
          data: { 
            receipt: path,
            receiptUrl: `/uploads/receipts/${filename}` 
          },
        });

        return reply.send({ receiptUrl: contribution.receiptUrl });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao fazer upload do comprovante' });
      }
    }
  );

  // Verificar contribuição
  app.patch('/:id/verify',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const { verified } = request.body as { verified: boolean };

        const contribution = await prisma.contribution.update({
          where: { id },
          data: {
            verified,
            verifiedBy: verified ? request.user.id : null,
            verifiedAt: verified ? new Date() : null,
          },
        });

        // Log de atividade
        await prisma.activityLog.create({
          data: {
            userId: request.user.id,
            action: verified ? 'VERIFY_CONTRIBUTION' : 'UNVERIFY_CONTRIBUTION',
            entity: 'contribution',
            entityId: id,
          },
        });

        return reply.send(contribution);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao verificar contribuição' });
      }
    }
  );
};
