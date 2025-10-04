# EDC+ - Sistema de Geração Automática de Cursos 🎓

![Version](https://img.shields.io/badge/version-3.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**EDC+** é um sistema educacional avançado que utiliza Inteligência Artificial para **gerar automaticamente cursos educacionais completos** - desde a estrutura curricular até páginas interativas de estudo. Transforme uma simples descrição como *"Quero aprender Mecânica Vetorial"* em um curso completo e estruturado.

## ✨ Funcionalidades Principais

- 🤖 **Geração Automática de Cursos** - Pipeline de IA multi-camada (OpenAI GPT-4o + Perplexity AI)
- 📚 **Estruturação Inteligente** - Organização pedagógica em módulos, tópicos e subtópicos
- 💬 **Chat Interativo** - Comandos naturais para personalização e geração
- ✏️ **Editor Avançado** - TinyMCE WYSIWYG para edição completa da estrutura
- 📊 **Progresso em Tempo Real** - Server-Sent Events (SSE) com feedback visual
- 🎯 **Personalização** - Questionário adaptativo baseado no perfil do usuário
- 🌐 **Interface Moderna** - Design responsivo com animações suaves

## 🚀 Demo

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/edc-plus.git

# Instale as dependências
cd edc-plus
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Adicione suas chaves de API da OpenAI e Perplexity

# Execute em modo desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação.

## 🏗️ Arquitetura

### Stack Tecnológico

- **Frontend:** Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Server-Sent Events (SSE)
- **IA:** OpenAI GPT-4o/GPT-4o-mini + Perplexity AI
- **Editor:** TinyMCE WYSIWYG
- **Estilização:** Tailwind CSS + CSS Modules

### Estrutura do Projeto

```
📁 src/
├── 📁 app/
│   ├── page.tsx                     # Interface principal (chat + editor)
│   ├── courses/[id]/page.tsx        # Página de curso interativa
│   └── 📁 api/
│       ├── analyze/route.ts         # Pipeline de geração de estrutura
│       ├── analyze/status/route.ts  # SSE para progresso em tempo real
│       └── create-course/route.ts   # Criação e redirecionamento
├── 📁 components/
│   ├── ChatInterface.tsx            # Chat com detecção de comandos
│   ├── TinySyllabusEditor.tsx       # Editor TinyMCE otimizado
│   ├── LoadingProgress.tsx          # Loading animado
│   └── UserQuestionnaire.tsx        # Questionário de personalização
└── 📁 lib/
    ├── course-generation-pipeline.ts # Pipeline completo de IA
    ├── openai.ts                    # Integração OpenAI
    └── perplexity.ts                # Integração Perplexity
```

## 🔄 Como Funciona

### 1. Descrição do Curso
O usuário descreve o que deseja estudar em linguagem natural:
```
"Quero aprender Mecânica Vetorial para Engenharia Civil"
```

### 2. Questionário Personalizado
Sistema coleta informações sobre:
- Nível de conhecimento (iniciante/intermediário/avançado)
- Objetivo (carreira/pessoal/projeto/acadêmico)
- Tempo disponível
- Background educacional
- Metas específicas

### 3. Pipeline de IA Multi-Camada
```typescript
// Fase 1 (0-25%): Análise Inicial
- Extração do assunto via GPT-4o
- Detecção de disciplina acadêmica

// Fase 2 (25-50%): Pesquisa Acadêmica
- Busca de tópicos via Perplexity AI
- Validação com fontes científicas

// Fase 3 (50-75%): Estruturação
- Geração de estrutura curricular
- Organização pedagógica em módulos

// Fase 4 (75-100%): Finalização
- Geração de pré-requisitos
- Recomendações bibliográficas
```

### 4. Edição e Refinamento
- Editor TinyMCE permite modificar toda a estrutura
- Chat permite ajustes via comandos naturais:
  - "Adicionar mais tópicos sobre X"
  - "Reorganizar a estrutura"
  - "Mudar o nível de dificuldade"

### 5. Geração do Curso
Comandos reconhecidos:
```
"gerar curso" | "criar curso" | "aprovar estrutura" | "gerar as aulas"
```

### 6. Página de Curso Interativa
- **Menu lateral hierárquico:** Módulos → Tópicos → Subtópicos
- **3 abas de conteúdo:** 📚 Teoria | 🎥 Vídeos | ✏️ Exercícios
- **Navegação fluida** com indicadores de progresso

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# APIs de IA (Obrigatórias)
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...

# Banco de dados (Opcional na V3)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Configurações do Pipeline
USE_NEW_PIPELINE=true
MIN_TOPICS_FOR_CLUSTERING=30
TARGET_MODULES_MIN=8
TARGET_MODULES_MAX=20
```

### Obter Chaves de API

- **OpenAI:** [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Perplexity:** [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)

## 📦 Scripts Disponíveis

```bash
npm run dev         # Desenvolvimento local (localhost:3000)
npm run build       # Build de produção
npm run start       # Executar build de produção
npm run lint        # Verificação de código
npm run type-check  # Verificação TypeScript
```

## 🎯 Casos de Uso

### Educação Formal
- Professores criando material didático estruturado
- Escolas desenvolvendo currículos personalizados
- Universidades organizando conteúdo de disciplinas

### Aprendizado Pessoal
- Estudantes autodidatas estruturando seus estudos
- Profissionais upskilling em novas áreas
- Entusiastas organizando conhecimento

### Empresas e Treinamentos
- Empresas criando cursos de treinamento interno
- Consultorias desenvolvendo material educacional
- Plataformas de e-learning automatizando produção

## 🔮 Roadmap (V2)

### Geração de Conteúdo Educacional
- [ ] Aula-texto automática para cada subtópico (GPT-4o)
- [ ] Integração YouTube API para vídeos contextuais
- [ ] Exercícios adaptativos gerados por IA
- [ ] Sistema de progresso do usuário

### Expansões Futuras
- [ ] Multi-usuário com autenticação
- [ ] Banco de dados completo (Supabase)
- [ ] Gamificação e sistema de conquistas
- [ ] Integração com bibliotecas digitais
- [ ] Mobile responsivo otimizado

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

Desenvolvido por **Wellington**

## 🙏 Agradecimentos

- OpenAI pela API GPT-4o
- Perplexity AI pela API de pesquisa acadêmica
- Comunidade Next.js e React
- TinyMCE pelo editor WYSIWYG

---

**⭐ Se este projeto foi útil, considere dar uma estrela no GitHub!**

**🚀 EDC+ V1 - Transformando ideias em cursos estruturados com IA**
