import { FastifyPluginAsync } from 'fastify';

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/image',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      const data = await request.file();
      // Implementação de upload
      return reply.send({ url: '/uploads/temp.jpg' });
    }
  );
};
