import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function seed() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Criar usuário administrador padrão
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL || 'admin@igreja.com' },
      update: {},
      create: {
        email: process.env.ADMIN_EMAIL || 'admin@igreja.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin criado:', admin.email);

    // Criar categorias padrão
    const categories = [
      { name: 'Dízimo', description: 'Contribuição regular de 10%', color: '#4CAF50', icon: '💰' },
      { name: 'Oferta', description: 'Oferta voluntária', color: '#2196F3', icon: '🎁' },
      { name: 'Oferta Missionária', description: 'Para missões', color: '#FF9800', icon: '✈️' },
      { name: 'Evento Especial', description: 'Eventos da igreja', color: '#9C27B0', icon: '🎉' },
      { name: 'Construção', description: 'Para obras e reformas', color: '#795548', icon: '🏗️' },
      { name: 'Assistência Social', description: 'Ajuda aos necessitados', color: '#E91E63', icon: '❤️' },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
    }

    console.log('✅ Categorias criadas');

    // Criar alguns membros de exemplo
    const members = [
      { name: 'João Silva', email: 'joao@example.com', phone: '(11) 98765-4321' },
      { name: 'Maria Santos', email: 'maria@example.com', phone: '(11) 98765-4322' },
      { name: 'Pedro Oliveira', email: 'pedro@example.com', phone: '(11) 98765-4323' },
      { name: 'Ana Costa', email: 'ana@example.com', phone: '(11) 98765-4324' },
      { name: 'Lucas Souza', email: 'lucas@example.com', phone: '(11) 98765-4325' },
    ];

    for (const member of members) {
      await prisma.member.upsert({
        where: { email: member.email },
        update: {},
        create: member,
      });
    }

    console.log('✅ Membros de exemplo criados');
    console.log('🎉 Seed concluído com sucesso!');
    console.log('\n📧 Login: admin@igreja.com');
    console.log('🔑 Senha: Admin123!');
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
