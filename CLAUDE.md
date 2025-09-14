# Claude Code Configuration

Este arquivo contém configurações e comandos úteis para o projeto EDC+.

## Comandos de Desenvolvimento

### Instalação e Setup
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Build e Produção
```bash
npm run build
npm start
```

### Testes e Qualidade
```bash
npm run lint
npm run type-check
```

## Estrutura do Projeto

- `src/app/` - Páginas e rotas da aplicação
- `src/components/` - Componentes React reutilizáveis
- `src/lib/` - Utilitários e integrações (OpenAI, Supabase, YouTube, Perplexity)
- `src/types/` - Definições de tipos TypeScript

## APIs Disponíveis

- `/api/analyze` - Análise de conteúdo
- `/api/analyze-with-files` - Análise com upload de arquivos
- `/api/load-topic-content` - Carregamento de conteúdo de tópicos
- `/api/upload` - Upload de arquivos

## Integrações

- **OpenAI**: Análise de conteúdo e geração de planos de aprendizado
- **Supabase**: Banco de dados e autenticação
- **YouTube**: Busca e integração de vídeos educacionais
- **Perplexity**: Pesquisa avançada de conteúdo

## Componentes Principais

- `ChatInterface` - Interface de chat principal
- `LearningPlan` - Exibição de planos de aprendizado
- `AcademicContent` - Conteúdo acadêmico
- `FileUpload` - Upload de arquivos PDF/documentos
- `UserQuestionnaire` - Questionário de perfil do usuário
- `VideoPlayer` - Player de vídeos integrado