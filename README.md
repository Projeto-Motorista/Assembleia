# 📱 Sistema de Gestão de Dízimos e Ofertas - Assembleia de Deus Vila Maria

Um sistema completo para gerenciamento de dízimos e ofertas desenvolvido para a **Assembleia de Deus Vila Maria**, com aplicações web e mobile modernas e seguras.

## ✨ Características Principais

- 🎨 **Design Moderno**: Interface elegante com splash screen animada personalizada
- 📱 **Multi-plataforma**: Apps mobile (iOS/Android) e web
- 🔐 **Seguro**: Autenticação JWT e permissões explícitas
- 📸 **Upload de Comprovantes**: Câmera e galeria com permissões controladas
- 📊 **Dashboard Interativo**: Gráficos e estatísticas em tempo real
- 📈 **Relatórios Completos**: Exportação para PDF e Excel
- 🌐 **API REST**: Backend robusto com Fastify + Prisma
- 💾 **Banco Relacional**: PostgreSQL com migrações automáticas

## 🏗️ Arquitetura do Sistema

```
dizimos/
├── backend/           # API REST (Node.js + Fastify + Prisma)
├── mobile/           # App mobile (React Native + Expo)
├── web/             # App web (Next.js)
└── package.json     # Monorepo configuration
```

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- Expo CLI (`npm install -g @expo/cli`)
- Git

### 1. Clone o Repositório

```bash
git clone <repository-url>
cd dizimos
```

### 2. Configuração do Backend

```bash
cd backend
npm install

# Configure o banco de dados
cp .env.example .env
# Edite o .env com suas configurações de banco

# Execute as migrações
npm run db:generate
npm run db:migrate

# Popule o banco com dados iniciais
npm run db:seed
```

### 3. Configuração do Mobile (React Native + Expo)

```bash
cd mobile
npm install

# Para executar no simulador/dispositivo
npm start

# Para gerar APK (Android)
expo build:android

# Para gerar IPA (iOS)
expo build:ios
```

### 4. Configuração do Web (Próxima versão)

```bash
cd web
npm install
npm run dev
```

## 📋 Variáveis de Ambiente

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/igreja_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3333
NODE_ENV=development

# Upload config
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# Admin default (será criado no seed)
ADMIN_EMAIL="admin@igreja.com"
ADMIN_PASSWORD="Admin123!"
```

## 🎯 Funcionalidades Implementadas

### 📱 App Mobile

#### 🌟 Splash Screen Animada
- Cruz com efeito de brilho dourado
- Nome da igreja com animações suaves
- Versículo bíblico (Malaquias 3:10)
- Elementos decorativos com gradientes

#### 🔐 Autenticação Segura
- Login com email/senha
- Armazenamento seguro de tokens (Expo SecureStore)
- Interceptadores automáticos de API
- Logout com confirmação

#### 📊 Dashboard Interativo
- Cards com estatísticas coloridas
- Gráfico de evolução mensal
- Ações rápidas com ícones elegantes
- Lista de contribuições recentes
- Pull-to-refresh

#### 👥 Gestão de Membros
- Lista com busca em tempo real
- Avatars com iniciais coloridas
- Contadores de contribuições
- Formulário de cadastro modal
- Validação de dados

#### 💰 Registro de Contribuições
- **Permissões Explícitas**: Solicita acesso à câmera/galeria apenas no momento do uso
- **Upload de Comprovantes**: Foto pela câmera ou seleção da galeria
- Seleção de membros e categorias
- Tipos de contribuição (Dízimo, Oferta, etc.)
- Múltiplos métodos de pagamento
- Verificação de contribuições

#### 📈 Relatórios e Exportações
- Relatórios por período
- Filtros por categoria e membro
- Interface preparada para exportação PDF/Excel

#### 👤 Perfil do Usuário
- Informações do administrador
- Configurações do app
- Logout seguro
- Informações da igreja

### 🖥️ Backend (API REST)

#### 🔗 Endpoints Principais

```
POST   /api/auth/login           # Login
POST   /api/auth/logout          # Logout
GET    /api/auth/me              # Perfil do usuário

GET    /api/members              # Listar membros
POST   /api/members              # Criar membro
PUT    /api/members/:id          # Atualizar membro
POST   /api/members/:id/photo    # Upload foto do membro

GET    /api/contributions        # Listar contribuições
POST   /api/contributions        # Registrar contribuição
POST   /api/contributions/:id/receipt  # Upload comprovante

GET    /api/categories           # Listar categorias
POST   /api/categories           # Criar categoria

GET    /api/dashboard/stats      # Estatísticas do dashboard
```

#### 🗄️ Modelo de Dados

- **Users**: Administradores do sistema
- **Members**: Membros da igreja
- **Categories**: Categorias de contribuição
- **Contributions**: Registro de dízimos e ofertas
- **Reports**: Relatórios gerados
- **ActivityLogs**: Log de atividades
- **Settings**: Configurações do sistema

## 📱 Permissões do App (Android)

O app solicita as seguintes permissões **apenas quando necessário**:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### 🔒 Política de Privacidade das Permissões

1. **Câmera**: Utilizada apenas para fotografar comprovantes de contribuições
2. **Galeria**: Para selecionar fotos de comprovantes já existentes
3. **Notificações**: Para lembretes administrativos (opcional)

## 🎨 Design System

### 🎨 Paleta de Cores

- **Primary Blue**: `#1E3A8A` (Azul da igreja)
- **Secondary Blue**: `#3B82F6` (Azul claro)
- **Gold**: `#FFD700` (Dourado para destaques)
- **Success**: `#10B981` (Verde para sucesso)
- **Warning**: `#F59E0B` (Laranja para avisos)
- **Error**: `#EF4444` (Vermelho para erros)

### 📐 Componentes

- Gradient Backgrounds
- Rounded Cards (16px radius)
- Floating Action Buttons
- Animated Icons
- Custom Tab Bar com botão central destacado

## 🔧 Scripts Disponíveis

### Raiz do Projeto
```bash
npm run install:all      # Instala dependências de todos os projetos
npm run dev:backend      # Inicia o backend
npm run dev:mobile       # Inicia o app mobile
npm run dev:web          # Inicia o app web (próxima versão)
```

### Backend
```bash
npm run dev              # Desenvolvimento com hot reload
npm run build            # Build para produção
npm run start            # Inicia em produção
npm run db:migrate       # Execute migrations
npm run db:generate      # Gera cliente Prisma
npm run db:studio        # Interface do banco
npm run db:seed          # Popula dados iniciais
```

### Mobile
```bash
npm start                # Inicia Expo
npm run android          # Abre no Android
npm run ios              # Abre no iOS
npm run web              # Versão web do Expo
```

## 👤 Credenciais Padrão

Após executar o seed:

- **Email**: `admin@igreja.com`
- **Senha**: `Admin123!`

## 🤝 Próximas Funcionalidades

- [ ] App Web com Next.js
- [ ] Notificações Push
- [ ] Sincronização Offline
- [ ] Exportação de Relatórios (PDF/Excel)
- [ ] Backup automático
- [ ] Multi-tenant (várias igrejas)
- [ ] Integração com APIs de pagamento

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema:

- **Igreja**: Assembleia de Deus Vila Maria
- **Sistema**: Gestão de Dízimos e Ofertas v1.0
- **Tecnologias**: React Native, Node.js, PostgreSQL

## 📄 Licença

Este projeto foi desenvolvido especificamente para a Assembleia de Deus Vila Maria.

---

> *"Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa, e depois fazei prova de mim, diz o Senhor dos exércitos, se eu não vos abrir as janelas do céu, e não derramar sobre vós uma bênção tal, que dela vos advenha a maior abastança."* - **Malaquias 3:10**
