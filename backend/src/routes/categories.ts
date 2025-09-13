import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      const categories = await prisma.category.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
      return reply.send(categories);
    }
  );

  app.post('/',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      const data = categorySchema.parse(request.body);
      const category = await prisma.category.create({ data });
      return reply.status(201).send(category);
    }
  );
};
