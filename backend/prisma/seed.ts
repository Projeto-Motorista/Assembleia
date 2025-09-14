import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@igreja.com' },
    update: {},
    create: {
      email: 'admin@igreja.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN'
    }
  });
  
  console.log('Seed completed! Login: admin@igreja.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
