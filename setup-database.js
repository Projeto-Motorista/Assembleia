const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// URL de conexão do PostgreSQL do Railway
const DATABASE_URL = 'postgresql://postgres:qYvOwSmMJadsgQdcRnnIhEOsDAGkXcXj@nozomi.proxy.rlwy.net:47295/railway';

async function setupDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL do Railway');

    // Criar extensão UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    console.log('✅ Extensão pgcrypto criada');

    // Criar tabela User
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ADMIN',
        active BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela User criada');

    // Criar tabela Session
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Session" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabela Session criada');

    // Criar tabela Member
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Member" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        "birthDate" TIMESTAMP,
        "memberSince" TIMESTAMP NOT NULL DEFAULT NOW(),
        "profilePhoto" TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela Member criada');

    // Criar tabela Category
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Category" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        color TEXT,
        icon TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela Category criada');

    // Criar tabela Transaction
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Transaction" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        type TEXT NOT NULL,
        "memberId" TEXT,
        "categoryId" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("memberId") REFERENCES "Member"(id) ON DELETE SET NULL,
        FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Tabela Transaction criada');

    // Criar tabela Event
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Event" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        location TEXT,
        "maxAttendees" INTEGER,
        active BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela Event criada');

    // Criar tabela ActivityLog
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        details TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabela ActivityLog criada');

    // Inserir usuário admin
    const hashedPassword = bcrypt.hashSync('Admin123!', 10);
    await client.query(`
      INSERT INTO "User" (email, password, name, role, active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@igreja.com', hashedPassword, 'Administrador', 'ADMIN', true]);
    console.log('✅ Usuário admin criado');

    // Inserir categorias
    const categories = [
      ['Dízimo', 'Dízimos dos membros', '#10B981', '💰'],
      ['Oferta', 'Ofertas voluntárias', '#3B82F6', '🎁'],
      ['Doação', 'Doações especiais', '#8B5CF6', '❤️']
    ];

    for (const [name, description, color, icon] of categories) {
      await client.query(`
        INSERT INTO "Category" (name, description, color, icon, active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
      `, [name, description, color, icon, true]);
    }
    console.log('✅ Categorias criadas');

    console.log('\n🎉 DATABASE SETUP COMPLETO!');
    console.log('📧 Email: admin@igreja.com');
    console.log('🔑 Senha: Admin123!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

setupDatabase();
