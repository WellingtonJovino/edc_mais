# 🎬 Configuração do Vídeo de Introdução

## 📋 Instruções para Adicionar o Vídeo

### 1. **Localização do Arquivo**
Coloque o vídeo `Video_Generation_From_Description` na pasta:
```
public/videos/Video_Generation_From_Description.mp4
```

### 2. **Formatos Suportados**
Para melhor compatibilidade, adicione os seguintes formatos:
- `Video_Generation_From_Description.mp4` (formato principal)
- `Video_Generation_From_Description.webm` (opcional, para melhor performance)

### 3. **Especificações Recomendadas**
- **Duração**: 5-10 segundos
- **Resolução**: 1920x1080 ou superior
- **Formato**: MP4 (H.264)
- **Tamanho**: Máximo 10MB para carregamento rápido
- **Audio**: Opcional (vídeo inicia mudo por padrão)

### 4. **Como o Sistema Funciona**

#### **Primeira Visita - Transição Suave em Camadas**
1. **Vídeo reproduz automaticamente** (áudio ativo por padrão)
2. **Botão "Pular Intro"** aparece após 2 segundos
3. **Detecção da parte branca** (últimos 1.5s do vídeo)
4. **Background overlay** aparece instantaneamente (cor #000618)
5. **Página principal** surge suavemente após 200ms
6. **Áudio do vídeo** continua tocando em background
7. **Fade silencioso** do áudio nos últimos 0.2s
8. **Remoção completa** do vídeo após 3 segundos

#### **Visitas Subsequentes**
- Sistema lembra que usuário já viu a intro
- Vai direto para a página principal
- Para resetar: limpe o localStorage do navegador ou use `?intro=true`

### 5. **Personalização Avançada**

#### **Ajustar Timing da Detecção da Parte Branca**
No arquivo `src/components/VideoIntro.tsx`, linha 58:
```typescript
// Mude o valor 1.5 para ajustar quando a transição começa
if (duration && currentTime >= duration - 1.5 && !isTransitioning) {
```

#### **Ajustar Suavidade da Transição**
No arquivo `src/app/page.tsx`, linha 52:
```typescript
// Mude o valor 200 para ajustar delay entre background e conteúdo
setTimeout(() => {
  setPageVisible(true);
}, 200);
```

#### **Desabilitar Intro Completamente**
No arquivo `src/app/page.tsx`, linha 14:
```typescript
// Mude para false para desabilitar o vídeo
const [showIntro, setShowIntro] = useState(false);
```

#### **Forçar Intro a Sempre Aparecer**
Remova as linhas 30-35 em `src/app/page.tsx`:
```typescript
// Comente ou remova este bloco
const hasSeenIntro = localStorage.getItem('hasSeenIntro');
if (hasSeenIntro === 'true') {
  setShowIntro(false);
  setPageVisible(true);
}
```

### 6. **Arquitetura da Transição Suave**

#### **Camadas Z-Index**
- **z-100:** VideoIntro (quando ativo/visível)
- **z-50:** Página Principal (conteúdo final)
- **z-30:** Background Overlay (camada intermediária)
- **z-10:** VideoIntro (quando em background para áudio)

#### **Sequência Temporal**
```
T=0ms    → Detecção da parte branca (1.5s antes do fim)
T=0ms    → Background overlay aparece (fade 300ms)
T=200ms  → Página principal inicia animação (800ms)
T=1000ms → Transição visual completa
T=2800ms → Fade do áudio inicia (últimos 0.2s)
T=3000ms → VideoIntro removido completamente
```

#### **Animações CSS**
- **background-fade:** 300ms ease-out (overlay)
- **smooth-page-reveal:** 800ms cubic-bezier com blur e movimento
- **Performance otimizada** com GPU acceleration

#### **Estados React**
```typescript
showIntro: boolean           // Controla renderização do vídeo
showVideoInBackground: boolean // Mantém vídeo para áudio
showBackgroundOverlay: boolean // Camada intermediária
pageVisible: boolean         // Página principal visível
```

### 7. **Troubleshooting**

#### **Vídeo Não Carrega**
- Verifique se o arquivo está em `public/videos/`
- Confirme o nome exato: `Video_Generation_From_Description.mp4`
- Teste com um vídeo menor primeiro

#### **Performance Lenta**
- Comprima o vídeo para menor tamanho
- Adicione versão WebM para melhor performance
- Considere usar um CDN para hospedar o vídeo

#### **Autoplay Não Funciona**
- Vídeos com áudio podem não reproduzir automaticamente em alguns navegadores
- Sistema está configurado para iniciar com áudio ativo (melhor experiência)
- Se houver problemas, o vídeo pode iniciar mudo automaticamente

#### **Transição Muito Rápida/Lenta**
- Ajuste o timing de detecção (linha 58 em VideoIntro.tsx)
- Modifique o delay da animação (linha 52 em page.tsx)
- Personalize as animações CSS em globals.css

#### **Página Aparece Abruptamente**
- Verifique se as classes CSS `background-fade` e `smooth-page-reveal` estão aplicadas
- Confirme que o background overlay está sendo renderizado (z-30)
- Teste a sequência de estados no DevTools

### 8. **Estrutura de Arquivos Final**
```
public/
└── videos/
    ├── Video_Generation_From_Description.mp4
    └── Video_Generation_From_Description.webm (opcional)
```

### 9. **Exemplo de Compressão de Vídeo**
Se o vídeo estiver muito grande, use FFmpeg:
```bash
# Comprimir para web
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 128k Video_Generation_From_Description.mp4

# Criar versão WebM
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -b:a 128k Video_Generation_From_Description.webm
```

## ✅ Resultado Esperado

1. **Vídeo carrega e reproduz automaticamente** com áudio ativo
2. **Background overlay** cobre a parte branca instantaneamente
3. **Página principal** surge suavemente com animação cinematográfica
4. **Áudio continua** durante a transição para máxima imersão
5. **Experiência fluida** sem "saltos" visuais ou interrupções
6. **Performance otimizada** com animações GPU-accelerated

---

**🎯 Agora é só adicionar o vídeo na pasta correta e tudo funcionará perfeitamente!**