# EDC+ Enhanced System - V2 MVP

## 🎯 Visão Geral

O **EDC+ Enhanced System** é a evolução da V1 que adiciona integração inteligente com documentos do usuário através de tecnologia RAG (Retrieval-Augmented Generation). O sistema agora pode processar documentos PDF e TXT enviados pelo usuário e integrá-los automaticamente à estrutura do curso gerado.

## 🆕 Novas Funcionalidades da V2

### 1. **Upload Enhanced de Documentos**
- **Endpoint**: `/api/upload/enhanced`
- **Formatos**: PDF, TXT, MD, DOCX (básico)
- **Processamento**: Extração de texto, chunking inteligente, embeddings
- **Análise**: TOC automático e extração de tópicos via IA

### 2. **Sistema RAG Completo**
- **Embeddings**: OpenAI text-embedding-3-small (configurável)
- **Chunking**: Baseado em caracteres com overlap inteligente
- **Matching**: 3 níveis (Strong ≥0.75, Weak 0.60-0.75, None <0.60)
- **Validação**: Cruzamento semântico entre tópicos do curso e documentos

### 3. **Pipeline Enhanced**
- **Endpoint**: `/api/analyze/enhanced`
- **Integração**: Combina pipeline V1 + análise de documentos
- **Matching**: Vincula tópicos existentes com conteúdo dos documentos
- **Expansão**: Cria novos tópicos derivados dos documentos

### 4. **Interface de Matching**
- **Componente**: `DocumentMatchingDisplay`
- **Visualização**: Estatísticas, matches, novos tópicos, arquivos processados
- **Feedback**: Indicadores visuais de qualidade dos matches

## 🏗️ Arquitetura Implementada

### **Novos Arquivos Criados**

```
📁 src/
├── 📁 app/api/
│   ├── upload/enhanced/route.ts        # API de upload enhanced
│   └── analyze/enhanced/
│       ├── route.ts                    # API de análise enhanced
│       └── status/route.ts             # SSE para progresso
├── 📁 components/
│   └── DocumentMatchingDisplay.tsx     # Interface de matching
└── 📁 lib/
    ├── text-extraction.ts              # Extração de texto
    ├── rag-processing.ts               # Embeddings e matching
    ├── document-analysis.ts            # Análise de documentos
    └── enhanced-pipeline.ts            # Pipeline integrado
```

### **Tipos TypeScript Adicionados**

```typescript
interface ProcessedFile {
  id: string;
  name: string;
  rawText: string;
  chunks: DocumentChunk[];
  extractedTopics: DocumentTopic[];
  processingStatus: 'complete' | 'error' | ...;
}

interface EnhancedCourseStructure {
  course: Course;                       // Estrutura base V1
  documentMatches: {...};               // Matches por tópico
  documentDerivedTopics: {...}[];       // Novos tópicos
  unmatchedTopics: {...}[];             // Tópicos sem match
}

interface TopicMatch {
  courseTopicId: string;
  documentTopicId?: string;
  matchType: 'strong' | 'weak' | 'none';
  similarityScore: number;
  linkedChunks?: {...}[];               // Para strong matches
}
```

## 🔄 Fluxo Completo Enhanced

### **1. Upload Enhanced (Usuário → Sistema)**
```bash
POST /api/upload/enhanced
Content-Type: multipart/form-data
files: [arquivo1.pdf, arquivo2.txt]
```

**Processamento:**
1. ✅ Validação de arquivos (tipo, tamanho)
2. 📄 Extração de texto (PDF básico, TXT direto)
3. ✂️ Chunking inteligente (1000 chars, 200 overlap)
4. 🧠 Geração de embeddings (OpenAI)
5. 🔍 Análise de tópicos via IA

**Resposta:**
```json
{
  "success": true,
  "processedFiles": [ProcessedFile[]],
  "stats": {
    "totalFiles": 2,
    "totalChunks": 45,
    "totalTokens": 12500
  }
}
```

### **2. Análise Enhanced (Sistema → IA)**
```bash
POST /api/analyze/enhanced
Content-Type: application/json
{
  "message": "Quero estudar Mecânica Vetorial",
  "userProfile": {...},
  "processedFiles": [ProcessedFile[]]
}
```

**Pipeline Enhanced:**
1. 📚 **Geração Base** (0-60%): Executa pipeline V1 original
2. 🔗 **Integração** (60-80%): Matching de tópicos com documentos
3. ➕ **Expansão** (80-90%): Criação de novos tópicos dos documentos
4. ✅ **Validação** (90-100%): Otimização pedagógica final

**Resposta:**
```json
{
  "success": true,
  "structure": {
    "course": Course,
    "documentMatches": {
      "topic-1": {
        "matchType": "strong",
        "documentSources": [...]
      }
    },
    "documentDerivedTopics": [...],
    "unmatchedTopics": [...]
  },
  "stats": {
    "totalTopics": 25,
    "documentMatchedTopics": 18,
    "strongMatches": 12,
    "weakMatches": 6
  }
}
```

## 🎛️ Configurações

### **Configuração do MVP** (em `DEFAULT_CONFIG`)
```typescript
{
  chunkSize: 1000,                      // caracteres por chunk
  chunkOverlap: 200,                    // overlap entre chunks
  embeddingModel: 'text-embedding-3-small', // modelo OpenAI
  strongMatchThreshold: 0.75,           // threshold para match forte
  weakMatchThreshold: 0.60,             // threshold para match fraco
  maxFileSize: 10 * 1024 * 1024,       // 10MB máximo
  enableOCR: false                      // OCR desabilitado no MVP
}
```

### **Variáveis de Ambiente Necessárias**
```bash
# Existentes (V1)
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
NEXT_PUBLIC_SUPABASE_URL=...

# Opcionais (V2 - usando defaults se não definidas)
ENHANCED_CHUNK_SIZE=1000
ENHANCED_OVERLAP=200
ENHANCED_STRONG_THRESHOLD=0.75
ENHANCED_WEAK_THRESHOLD=0.60
```

## 📊 Sistema de Matching

### **Tipos de Match**

1. **Strong Match (≥0.75)**
   - ✅ Tópico do curso tem correspondência forte no documento
   - 🔗 Chunks são vinculados diretamente ao tópico
   - 📝 Conteúdo usado para geração de aula-texto futura

2. **Weak Match (0.60-0.75)**
   - ⚠️ Correspondência parcial identificada
   - 🔍 Gaps são analisados via IA
   - 💡 Sugestões de granularização fornecidas

3. **No Match (<0.60)**
   - ❌ Sem correspondência significativa
   - ➕ Novos tópicos criados se vierem de documentos
   - 🌐 Tópicos do curso marcados para busca externa

### **Algoritmo de Matching**

```typescript
// 1. Gerar embeddings para tópicos do curso
courseEmbeddings = await generateEmbeddings(courseTopics);

// 2. Gerar embeddings para tópicos dos documentos
documentEmbeddings = await generateEmbeddings(documentTopics);

// 3. Calcular similaridade coseno
for (courseTopic of courseTopics) {
  bestMatch = findBestMatch(courseTopic, documentTopics);

  if (similarity >= 0.75) {
    matches.push({ type: 'strong', linkedChunks: [...] });
  } else if (similarity >= 0.60) {
    matches.push({ type: 'weak', gaps: [...] });
  } else {
    matches.push({ type: 'none' });
  }
}

// 4. Criar novos tópicos para documentTopics não matcheados
createNewTopicsFromUnmatched(documentTopics, matches);
```

## 🎨 Interface Enhanced

### **DocumentMatchingDisplay Component**

**Seções:**
1. **Estatísticas Gerais**: Resumo visual com percentuais
2. **Tópicos Integrados**: Lista de matches com sources
3. **Novos Tópicos**: Tópicos derivados dos documentos
4. **Tópicos sem Match**: Necessitam conteúdo externo
5. **Documentos Processados**: Status dos arquivos

**Features:**
- 📊 Barra de progresso de cobertura
- 🏷️ Badges coloridos por tipo de match
- 📄 Preview de chunks relevantes
- 🔗 Links para visualização detalhada

## 🧪 Testes

### **Arquivo de Teste**: `test-enhanced-upload.js`

**Fluxo de Teste:**
1. 📤 Upload de arquivo de teste (mecânica vetorial)
2. 🔍 Análise enhanced com perfil de usuário
3. 📊 Verificação de estatísticas de matching
4. ✅ Validação de resultados

**Execução:**
```javascript
// No browser console ou Node.js
await testEnhancedUpload();
```

## 🚀 Melhorias Futuras (Pós-MVP)

### **Processamento Avançado**
- 🖼️ OCR para PDFs escaneados (Tesseract/AWS Textract)
- 📊 Suporte para tabelas e figuras
- 🔄 Pipeline assíncrono com workers
- 💾 Cache de embeddings

### **Matching Inteligente**
- 🧮 Clustering automático de chunks
- 🎯 Calibração de thresholds por domínio
- 🔍 Fuzzy matching para títulos similares
- 📈 Feedback loop para melhorar matches

### **Interface Rica**
- 🖱️ Drag & drop para reorganizar tópicos
- 👁️ Visualização de chunks em modal
- ✏️ Edição inline de matches
- 📱 Interface responsiva para mobile

## 🎯 Valor Entregue pela V2

### **Para o Usuário**
- ✅ **Personalização Máxima**: Cursos baseados no próprio material
- 🎯 **Relevância Alta**: Conteúdo adaptado aos documentos fornecidos
- ⚡ **Eficiência**: Aproveitamento automático de material existente
- 🔍 **Transparência**: Visualização clara de como documentos foram usados

### **Para o Sistema**
- 🧠 **IA Contextual**: RAG permite respostas mais precisas
- 📈 **Escalabilidade**: Pipeline preparado para múltiplos formatos
- 🔧 **Flexibilidade**: Configurações ajustáveis por caso de uso
- 🏗️ **Extensibilidade**: Base sólida para funcionalidades futuras

## ✅ Status de Implementação

- ✅ **Upload Enhanced**: Completo
- ✅ **Extração de Texto**: PDF básico + TXT
- ✅ **Sistema RAG**: Embeddings + Matching
- ✅ **Pipeline Enhanced**: Integração completa
- ✅ **Interface de Matching**: Visualização rica
- ✅ **APIs RESTful**: Endpoints documentados
- ✅ **Progresso em Tempo Real**: SSE implementado
- ✅ **Tipos TypeScript**: Tipagem completa

**A V2 MVP está pronta para uso e teste! 🎉**

---

**Próximo Passo**: Teste em ambiente real com documentos acadêmicos e refinamento baseado em feedback.