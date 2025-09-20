# EDC+ - Plataforma de Aprendizado com IA
> **Nota:** Para visão completa do produto, consulte `docs/VISION.md`
> Este documento foca na implementação do MVP.
## Objetivo do Projeto
Criar uma plataforma web que transforma objetivos de estudo em cursos estruturados usando IA, com syllabus personalizado, aulas texto, vídeos do YouTube e exercícios.

## MVP - Fase 1: Sistema Base (Prioridade Alta)

### Stack Tecnológica
```
Frontend: React + TypeScript + Tailwind CSS
Backend: Node.js + Express
Database: PostgreSQL (Supabase para simplicidade)
IA: OpenAI API (GPT-4)
Deploy: Vercel (frontend) + Railway/Render (backend)
```

### Estrutura de Pastas
```
edc-plus/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Syllabus/
│   │   │   └── Course/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── README.md
```

## Tarefas de Implementação - Sprint 1

### 1. Setup Inicial do Projeto
```bash
# Criar estrutura base
mkdir edc-plus
cd edc-plus
npx create-react-app frontend --template typescript
mkdir backend
cd backend && npm init -y
```

**Arquivos necessários:**
- [ ] `.env` para variáveis de ambiente
- [ ] `.gitignore` 
- [ ] `README.md` com instruções de setup

### 2. Página Inicial com Chat

**Arquivo:** `frontend/src/pages/HomePage.tsx`

**Requisitos:**
- Interface de chat similar ao ChatGPT
- Campo de input com placeholder "O que você quer aprender?"
- Botão para anexar arquivos
- Área de mensagens com scroll

**Componentes necessários:**
```typescript
// ChatInterface.tsx
- Container principal do chat
- Lista de mensagens
- Input de mensagem
- Botão de enviar

// Message.tsx
- Mensagem do usuário
- Mensagem da IA
- Indicador de loading
```

### 3. Modal de Perguntas Personalizadas

**Arquivo:** `frontend/src/components/OnboardingModal.tsx`

**Implementar sequência de perguntas:**
1. Qual é seu nível de conhecimento? (Iniciante/Intermediário/Avançado)
2. Por que você quer aprender isso? (Desenvolvimento de carreira/Interesse pessoal/Estudos acadêmicos)
3. Quanto tempo você tem disponível? (Slider: 30min a 3+ horas/dia)
4. Qual é sua experiência relacionada? (Campo de texto)
5. Objetivos específicos (Campo de texto)

**Estado a manter:**
```typescript
interface UserProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  purpose: string;
  timeAvailable: number;
  experience: string;
  objectives: string;
}
```

### 4. Geração de Syllabus via OpenAI

**Arquivo:** `backend/src/services/syllabusGenerator.js`

**Prompt base para OpenAI:**
```javascript
const generateSyllabus = async (topic, userProfile) => {
  const prompt = `
    Crie um syllabus estruturado para aprender "${topic}".
    
    Perfil do aluno:
    - Nível: ${userProfile.level}
    - Objetivo: ${userProfile.purpose}
    - Tempo disponível: ${userProfile.timeAvailable} horas/dia
    
    Retorne um JSON com a seguinte estrutura:
    {
      "title": "Título do Curso",
      "modules": [
        {
          "id": 1,
          "title": "Nome do Módulo",
          "topics": [
            {
              "id": "1.1",
              "title": "Nome do Tópico",
              "subtopics": ["subtópico 1", "subtópico 2"],
              "estimatedTime": "2 horas"
            }
          ]
        }
      ]
    }
    
    Inclua 5-8 módulos principais, cada um com 3-5 tópicos.
    Organize do básico ao avançado.
  `;
  
  // Chamar OpenAI API
  // Retornar JSON estruturado
};
```

### 5. Interface de Edição do Syllabus

**Arquivo:** `frontend/src/components/SyllabusEditor.tsx`

**Funcionalidades:**
- Exibir syllabus em formato de árvore editável
- Permitir adicionar/remover/editar tópicos
- Drag and drop para reorganizar
- Botão "Aprovar e Gerar Curso"

**Biblioteca sugerida:** `react-sortable-tree` ou implementação própria com `react-beautiful-dnd`

### 6. Backend API Endpoints

**Arquivo:** `backend/src/routes/api.js`

```javascript
// Endpoints necessários:
POST /api/generate-syllabus
  Body: { topic, userProfile }
  Response: { syllabus }

POST /api/save-syllabus
  Body: { userId, syllabus }
  Response: { syllabusId }

GET /api/syllabus/:id
  Response: { syllabus }

PUT /api/syllabus/:id
  Body: { updates }
  Response: { success }
```

### 7. Database Schema

**Arquivo:** `backend/src/db/schema.sql`

```sql
-- Tabelas essenciais para MVP
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  topic VARCHAR(255),
  syllabus JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  level VARCHAR(50),
  preferences JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Sprint 2 - Geração de Conteúdo

### 8. Geração de Aulas Texto

**Arquivo:** `backend/src/services/contentGenerator.js`

**Para cada subtópico, gerar:**
- Introdução ao conceito
- Explicação detalhada
- Exemplos práticos
- Fórmulas (se aplicável)
- Resumo

### 9. Integração com YouTube API

**Arquivo:** `backend/src/services/youtubeService.js`

```javascript
// Buscar vídeos relevantes para cada tópico
const searchVideos = async (topic) => {
  // Usar YouTube Data API v3
  // Filtrar por relevância e qualidade
  // Retornar top 3-5 vídeos
};
```

### 10. Interface do Curso

**Arquivo:** `frontend/src/pages/CoursePage.tsx`

**Layout:**
- Sidebar esquerda: navegação por módulos
- Área central: conteúdo (tabs para Texto/Vídeos/Exercícios)
- Header: progresso do curso
- Usar fundo escuro consistente com o tema

## Sprint 3 - RAG e Melhorias

### 11. Sistema RAG Básico

**Implementar depois do MVP funcionar:**
- Upload e processamento de PDFs
- Chunking de documentos
- Embeddings com OpenAI
- Vector store (começar com PostgreSQL pgvector)

### 12. Sistema de Exercícios

**Tipos de exercícios:**
- Questões abertas
- Múltipla escolha
- Problemas numéricos

## Configuração de Ambiente

### Variáveis necessárias (.env):
```
# Backend
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3001

# Frontend
REACT_APP_API_URL=http://localhost:3001s
```

## Comandos de Desenvolvimento

```bash
# Frontend
cd frontend
npm install
npm start

# Backend
cd backend
npm install
npm run dev

# Database
npm run db:migrate
npm run db:seed
```

## Prioridades de Implementação

1. **Crítico (Sprint 1):**
   - [ ] Chat interface funcional
   - [ ] Geração de syllabus com OpenAI
   - [ ] Edição de syllabus
   - [ ] Salvar no banco de dados

2. **Importante (Sprint 2):**
   - [ ] Geração de conteúdo texto
   - [ ] Busca de vídeos YouTube
   - [ ] Interface de curso navegável

3. **Nice to have (Sprint 3):**
   - [ ] Upload de PDFs
   - [ ] Sistema RAG
   - [ ] Exercícios com validação
   - [ ] Sistema de progresso

## Notas para Implementação

### UI/UX:
- Manter design escuro/moderno (inspiração: Vercel, Linear)
- Usar Tailwind classes: `bg-gray-900`, `bg-gradient-to-br from-gray-900 to-gray-800`
- Componentes com bordas sutis: `border border-gray-700`
- Hover effects suaves: `hover:bg-gray-800 transition-colors`

### Performance:
- Implementar loading states para todas as operações async
- Cache de syllabus gerados
- Lazy loading de conteúdo do curso

### Segurança:
- Rate limiting nas APIs
- Validação de input do usuário
- Sanitização de conteúdo gerado

## Exemplo de Início Rápido

```typescript
// App.tsx inicial
import React from 'react';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <ChatInterface />
    </div>
  );
}

export default App;
```

## Próximos Passos

1. Criar projeto base com estrutura de pastas
2. Implementar chat interface
3. Conectar com OpenAI para geração de syllabus
4. Adicionar editor de syllabus
5. Implementar persistência no banco
6. Iterar com melhorias incrementais

---

**IMPORTANTE:** Começar SEMPRE pelo mais simples que funciona, depois adicionar complexidade. O objetivo inicial é ter um fluxo completo funcionando: usuário digita tópico → gera syllabus → edita → salva.