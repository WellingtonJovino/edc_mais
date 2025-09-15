# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run type-check    # Check TypeScript types
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
- `OPENAI_API_KEY` - Required for AI features and aula-texto generation
- `YOUTUBE_API_KEY` - Required for video search functionality
- `PERPLEXITY_API_KEY` - Required for academic content enhancement
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Required for data persistence

## Core Architecture

### Dual Learning System Architecture

The system supports two course structures:
1. **Legacy Structure**: `topics[]` - Simple list of topics (backward compatibility)
2. **Hierarchical Structure**: `modules[] > sections[] > topics[]` - Responde Aí inspired structure

Both structures coexist, with automatic fallbacks and conversion utilities in `/src/app/api/analyze/route.ts`.

### AI-Enhanced Content Pipeline

**Aula-Texto Generation**: Multi-stage pipeline for educational content
- Input: Topic + level + optional RAG context
- Stage 1: Generate structured content using pedagogical prompts (`/src/lib/prompts/aulaTexto.ts`)
- Stage 2: Quality assessment (0-10 score) with detailed rubric
- Stage 3: Automatic improvement if score < 8
- Stage 4: Optional AI image generation (DALL-E + Gemini Nano)

**RAG System**: Contextual content enhancement
- `/src/lib/rag.ts` - Combines uploaded files + Perplexity search
- `/src/lib/openai-files.ts` - OpenAI File Search integration
- `/src/lib/perplexity.ts` - Academic content retrieval

### Image Generation System

**Gemini Nano + DALL-E Pipeline**:
- Gemini Nano (local browser AI) optimizes prompts
- DALL-E 3 generates final images
- Client-side component: `/src/components/GeminiNanoImageGenerator.tsx`
- Server API: `/src/app/api/generate-images/route.ts`
- Automatic integration in aula-texto generation

### Key API Endpoints

**Course Management**:
- `POST /api/analyze` - Generate course from user input (handles both legacy and hierarchical structures)
- `POST /api/analyze-with-files` - Enhanced course generation with file uploads
- `GET/POST /api/courses/[id]/chat` - Interactive course chat with difficulty detection

**Content Generation**:
- `POST /api/generate-aula-texto` - Generate pedagogical text lessons with optional images
- `POST /api/load-topic-content` - Dynamically load content for specific topics
- `POST /api/generate-images` - Standalone AI image generation

**Support Features**:
- `POST /api/courses/support/create` - Auto-generate prerequisite courses
- `POST /api/upload` - File upload with OpenAI integration

### Component Architecture

**Course Views**:
- `/src/components/HierarchicalCourseView.tsx` - Modern Responde Aí-style interface
- `/src/app/courses/[id]/page.tsx` - Adaptive course page (hierarchical vs legacy)
- `/src/components/EnhancedAulaTexto.tsx` - Rich text lesson display with formulas and images

**Learning Features**:
- `/src/components/CourseChat.tsx` - AI tutoring with automatic support course suggestions
- `/src/components/PrerequisitesSection.tsx` - Dynamic prerequisite display
- `/src/components/VideoPlayer.tsx` - YouTube integration

### Type System

**Core Learning Types** (`/src/types/index.ts`):
- `LearningGoal` - Contains both `modules[]` and `topics[]` for dual structure support
- `Module > Section > Topic` - Hierarchical organization
- `AulaTextoStructure` - Pedagogical content with visual elements support
- `Prerequisite` - Multi-level prerequisite system

### Database Integration

**Supabase Schema**:
- Courses support both flat and hierarchical structures
- File storage with OpenAI integration metadata
- Chat history persistence
- Progress tracking across different content types

## Special Features

### Gemini Nano Integration
- Uses Chrome's local AI API (no external API needed)
- Fallback to DALL-E if unavailable
- Test page: `/test-gemini`

### Pedagogical AI
- Scientific prompt engineering based on educational research
- Automatic quality assessment and improvement
- LaTeX formula support
- Multi-modal content generation (text + images + formulas)

### Difficulty Detection & Support Courses
- Real-time analysis of student chat messages
- Automatic prerequisite gap detection
- Dynamic support course generation
- Adaptive learning pathways

## Data Flow Patterns

1. **Course Creation**: User input → AI analysis → Content generation → Structure conversion → Database save
2. **Content Enhancement**: Base content → RAG context → Quality assessment → Improvement → Image generation
3. **Learning Support**: Chat interaction → Difficulty detection → Support course suggestions → Auto-generation
4. **Progress Tracking**: User actions → Progress updates → Adaptive content recommendations