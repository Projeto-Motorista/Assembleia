import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stats',
    { preHandler: [app.authenticate as any] },
    async (request: any, reply) => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());

        const [
          totalMembers,
          activeMembers,
          monthlyContributions,
          yearlyContributions,
          weeklyContributions,
          totalContributions,
          recentContributions
        ] = await Promise.all([
          // Total de membros
          prisma.member.count({ where: { active: true } }),
          
          // Membros ativos (que contribuíram este mês)
          prisma.member.count({
            where: {
              active: true,
              contributions: {
                some: {
                  date: { gte: startOfMonth }
                }
              }
            }
          }),
          
          // Contribuições do mês
          prisma.contribution.aggregate({
            where: { date: { gte: startOfMonth } },
            _sum: { amount: true },
            _count: true,
          }),
          
          // Contribuições do ano
          prisma.contribution.aggregate({
            where: { date: { gte: startOfYear } },
            _sum: { amount: true },
          }),
          
          // Contribuições da semana
          prisma.contribution.aggregate({
            where: { date: { gte: startOfWeek } },
            _sum: { amount: true },
          }),
          
          // Total geral de contribuições
          prisma.contribution.aggregate({
            _sum: { amount: true },
            _count: true,
          }),
          
          // Contribuições recentes
          prisma.contribution.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: {
              member: {
                select: { id: true, name: true }
              },
              category: true,
            }
          }),
        ]);

        // Distribuição por tipo (mês atual)
        const typeDistribution = await prisma.contribution.groupBy({
          by: ['type'],
          where: { date: { gte: startOfMonth } },
          _sum: { amount: true },
          _count: true,
        });

        // Distribuição por método de pagamento (mês atual)
        const paymentMethodDistribution = await prisma.contribution.groupBy({
          by: ['paymentMethod'],
          where: { date: { gte: startOfMonth } },
          _sum: { amount: true },
          _count: true,
        });

        // Top contribuidores do mês (compatível com SQLite via groupBy + join manual)
        const topRaw = await prisma.contribution.groupBy({
          by: ['memberId'],
          where: { date: { gte: startOfMonth } },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 5,
        });
        const memberIds = topRaw.map(t => t.memberId).filter(Boolean) as string[];
        const topMembers = memberIds.length
          ? await prisma.member.findMany({
              where: { id: { in: memberIds } },
              select: { id: true, name: true },
            })
          : [];
        const topContributors = topRaw.map(t => ({
          id: t.memberId,
          name: topMembers.find(m => m.id === t.memberId)?.name ?? '—',
          total: t._sum.amount ?? 0,
        }));

        // Gráfico de evolução mensal (últimos 12 meses) calculado em JS
        const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        const evolData = await prisma.contribution.findMany({
          where: { date: { gte: lastYearStart } },
          select: { date: true, amount: true },
          orderBy: { date: 'asc' },
        });
        const monthlyMap = new Map<string, { month: string; total: number; count: number }>();
        for (const c of evolData) {
          const d = new Date(c.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
          const acc = monthlyMap.get(key) ?? { month: label, total: 0, count: 0 };
          acc.total += Number(c.amount || 0);
          acc.count += 1;
          monthlyMap.set(key, acc);
        }
        const monthlyEvolution = Array.from(monthlyMap.values()).sort((a, b) => (a.month < b.month ? 1 : -1));

        return reply.send({
          overview: {
            totalMembers,
            activeMembers,
            monthlyTotal: monthlyContributions._sum.amount || 0,
            monthlyCount: monthlyContributions._count,
            yearlyTotal: yearlyContributions._sum.amount || 0,
            weeklyTotal: weeklyContributions._sum.amount || 0,
            totalAmount: totalContributions._sum.amount || 0,
            totalCount: totalContributions._count,
          },
          recentContributions,
          topContributors,
          charts: {
            monthlyEvolution,
            typeDistribution,
            paymentMethodDistribution,
          }
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar estatísticas' });
      }
    }
  );
};
