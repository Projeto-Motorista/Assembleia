const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔐 Criando usuário administrador...');
    
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@igreja.com' },
      update: {},
      create: {
        email: 'admin@igreja.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN',
        active: true
      },
    });

    console.log('✅ Admin criado:', admin.email);
    console.log('📧 Login: admin@igreja.com');
    console.log('🔑 Senha: Admin123!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
