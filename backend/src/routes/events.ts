import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const createSchema = z.object({
    title: z.string().min(2),
    datetime: z.string(), // ISO string
    description: z.string().optional().nullable(),
    memberId: z.string().optional().nullable(),
  });

  const updateSchema = z.object({
    title: z.string().min(2).optional(),
    datetime: z.string().optional(),
    description: z.string().optional().nullable(),
    memberId: z.string().optional().nullable(),
  });

  // Listar eventos
  app.get('/', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    try {
      const { page = 1, limit = 50, from, to, memberId } = request.query as any;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (from || to) {
        where.datetime = {};
        if (from) where.datetime.gte = new Date(from);
        if (to) where.datetime.lte = new Date(to);
      }
      if (memberId) where.memberId = String(memberId);

      const [events, total] = await Promise.all([
        prisma.calendarEvent.findMany({
          where,
          orderBy: { datetime: 'asc' },
          skip,
          take: Number(limit),
          include: { member: { select: { id: true, name: true } } },
        }),
        prisma.calendarEvent.count({ where }),
      ]);

      return reply.send({
        events,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar eventos' });
    }
  });

  // Criar evento
  app.post('/', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    try {
      const data = createSchema.parse(request.body);
      const event = await prisma.calendarEvent.create({
        data: {
          title: data.title,
          description: data.description || undefined,
          datetime: new Date(data.datetime),
          memberId: data.memberId || undefined,
        },
      });
      return reply.status(201).send(event);
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      return reply.status(500).send({ error: 'Erro ao criar evento' });
    }
  });

  // Atualizar evento
  app.put('/:id', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    try {
      const { id } = request.params as any;
      const body = updateSchema.parse(request.body);

      const existing = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Evento não encontrado' });

      const event = await prisma.calendarEvent.update({
        where: { id },
        data: {
          title: body.title ?? existing.title,
          description: body.description ?? existing.description ?? undefined,
          datetime: body.datetime ? new Date(body.datetime) : existing.datetime,
          memberId: body.memberId ?? existing.memberId ?? undefined,
        },
      });
      return reply.send(event);
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      return reply.status(500).send({ error: 'Erro ao atualizar evento' });
    }
  });

  // Deletar evento
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    try {
      const { id } = request.params as any;
      const existing = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Evento não encontrado' });

      await prisma.calendarEvent.delete({ where: { id } });
      return reply.send({ message: 'Evento removido com sucesso' });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erro ao deletar evento' });
    }
  });
};
