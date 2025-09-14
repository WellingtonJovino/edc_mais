# Integração com Perplexity - Conteúdo Acadêmico

## Overview

A integração com o Perplexity foi implementada para fornecer conteúdo acadêmico complementar aos vídeos do YouTube, oferecendo aos usuários duas modalidades de aprendizado:

1. **Vídeos (YouTube)** - Conteúdo visual e interativo
2. **Conteúdo Acadêmico (Perplexity)** - Artigos, papers e materiais acadêmicos estruturados

## Configuração

### 1. API Key do Perplexity

Adicione sua chave da API do Perplexity no arquivo `.env.local`:

```env
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

Para obter uma chave da API:
1. Acesse [Perplexity API](https://www.perplexity.ai/settings/api)
2. Crie uma conta ou faça login
3. Gere uma nova API key
4. Copie e cole no arquivo `.env.local`

### 2. Estrutura dos Dados

O sistema agora inclui os seguintes novos tipos:

- `AcademicContent` - Conteúdo acadêmico estruturado
- `AcademicReference` - Referências acadêmicas com metadados
- `PerplexityResponse` - Resposta da API do Perplexity

## Funcionalidades Implementadas

### 1. Busca de Conteúdo Acadêmico

- Pesquisa automatizada de artigos científicos, papers e materiais acadêmicos
- Suporte para conteúdo em português e inglês
- Extração automática de citações e referências

### 2. Geração de Resumo Didático

Cada tópico agora recebe um resumo estruturado com:

- **Introdução**: Explicação geral do tema (2-3 parágrafos)
- **Conceitos-chave**: Lista dos principais conceitos em bullet points
- **Exemplos Práticos**: Aplicações práticas do conhecimento
- **Erros Comuns**: Mal-entendidos e erros frequentes
- **Referências**: Lista de fontes acadêmicas com metadados completos

### 3. Interface Dual

Cada tópico no plano de aprendizado oferece:

- **Aba "Vídeos"**: Lista de vídeos do YouTube relacionados
- **Aba "Conteúdo Acadêmico"**: Resumo acadêmico estruturado com navegação por seções

## Como Usar

### 1. Criando um Plano de Aprendizado

Quando você cria um novo plano de aprendizado:

```typescript
// O sistema automaticamente:
1. Busca vídeos no YouTube
2. Pesquisa conteúdo acadêmico no Perplexity
3. Gera resumo didático estruturado
4. Combina ambos os conteúdos no plano final
```

### 2. Navegando pelo Conteúdo

Na interface do tópico:

1. **Expandir Tópico**: Clique no tópico para ver as opções
2. **Escolher Modalidade**: 
   - Clique em "Vídeos" para ver conteúdo do YouTube
   - Clique em "Conteúdo Acadêmico" para ver material científico
3. **Navegar Seções**: No conteúdo acadêmico, use as abas para navegar entre:
   - Introdução
   - Conceitos-chave
   - Exemplos Práticos
   - Erros Comuns
   - Referências

## Arquivos Modificados/Criados

### Novos Arquivos
- `src/lib/perplexity.ts` - Serviço de integração com Perplexity
- `src/components/AcademicContent.tsx` - Componente para exibir conteúdo acadêmico
- `PERPLEXITY_INTEGRATION.md` - Esta documentação

### Arquivos Modificados
- `src/types/index.ts` - Adicionados novos tipos para conteúdo acadêmico
- `src/app/api/analyze/route.ts` - Integração da busca acadêmica no fluxo principal
- `src/components/LearningPlan.tsx` - Interface dual para vídeos e conteúdo acadêmico
- `.env.example` - Adicionada variável PERPLEXITY_API_KEY

## Modelo de Resposta Acadêmica

Exemplo de estrutura do conteúdo acadêmico gerado:

```json
{
  "introduction": "Explicação introdutória sobre o tema...",
  "keyConcepts": [
    "Conceito 1: Definição e importância",
    "Conceito 2: Aplicação prática",
    "Conceito 3: Relação com outros temas"
  ],
  "practicalExamples": [
    "Exemplo 1: Caso de uso real",
    "Exemplo 2: Implementação prática"
  ],
  "commonMisunderstandings": [
    "Erro comum 1: Descrição e correção",
    "Erro comum 2: Como evitar"
  ],
  "references": [
    {
      "title": "Título do artigo/paper",
      "authors": ["Autor 1", "Autor 2"],
      "year": 2024,
      "url": "https://fonte.com",
      "type": "article"
    }
  ]
}
```

## Tratamento de Erros

O sistema inclui tratamento robusto de erros:

- **Falha na API do Perplexity**: Tópico é criado apenas com vídeos
- **Erro na geração de resumo**: Fallback para resposta raw do Perplexity
- **Problemas de parsing**: Logs detalhados para debugging

## Performance

- **Busca Paralela**: Vídeos e conteúdo acadêmico são buscados simultaneamente
- **Timeout Configurável**: Evita travamentos em APIs lentas
- **Cache**: Respostas são armazenadas para reutilização

## Próximos Passos

Possíveis melhorias futuras:
1. Cache local do conteúdo acadêmico
2. Suporte a mais idiomas
3. Filtros por tipo de fonte (artigos, papers, livros)
4. Exportação de referências em formato BibTeX
5. Integração com outras bases acadêmicas (PubMed, ArXiv, etc.)