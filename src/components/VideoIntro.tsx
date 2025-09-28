'use client';

import { useState, useEffect, useRef } from 'react';
import { X, VolumeX, Volume2, Play, Brain, BookOpen, Sparkles, Zap, ArrowRight, CheckCircle, MessageSquare, FileText, BarChart3, Target, Lightbulb, Code2 } from 'lucide-react';

interface VideoIntroProps {
  onComplete: () => void;
}

export default function VideoIntro({ onComplete }: VideoIntroProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  // Removido showWhiteFlash - não precisamos mais da transição visual
  const [videoStarted, setVideoStarted] = useState(false);
  const [showButtonLoading, setShowButtonLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showImage, setShowImage] = useState(true);
  // Removido showPagePreview - página será renderizada diretamente pelo page.tsx
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldFinishAudio, setShouldFinishAudio] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Fallback mais rápido: se o vídeo não carregar em 3 segundos, mostrar como carregado
    const fallbackTimer = setTimeout(() => {
      if (!isLoaded) {
        console.log('Video fallback: forcing loaded state after timeout');
        setIsLoaded(true);
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [isLoaded]);

  useEffect(() => {
    let skipTimer: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    // Só configurar monitoramento se o vídeo já começou
    if (videoStarted) {
      // Mostrar botão de pular após 2 segundos
      skipTimer = setTimeout(() => {
        setShowSkip(true);
      }, 2000);

      // Monitorar o progresso do vídeo para detectar o clarão
      const checkVideoProgress = () => {
        if (videoRef.current) {
          const video = videoRef.current;
          const currentTime = video.currentTime;
          const duration = video.duration;

          // Detectar parte branca do vídeo (últimos 1.5 segundos) para mostrar página
          if (duration && currentTime >= duration - 1.5 && !isTransitioning) {
            console.log('White flash detected - showing main page over video');
            setIsTransitioning(true);

            // Mostrar página principal sobrepondo o vídeo (mas manter áudio)
            onComplete();

            // Limpar interval para parar monitoramento
            if (interval) {
              clearInterval(interval);
              interval = null;
            }

            return; // Não executar a lógica de finalização ainda
          }

          // Detecção do final real do vídeo (últimos 0.2 segundos) para finalizar áudio silenciosamente
          if (duration && currentTime >= duration - 0.2 && !shouldFinishAudio) {
            console.log('Video almost ended - fading audio silently');
            setShouldFinishAudio(true);

            // Fade do áudio silenciosamente (página já está visível)
            if (videoRef.current && videoRef.current.volume > 0) {
              const audio = videoRef.current;
              const fadeAudio = () => {
                if (audio.volume > 0.1) {
                  audio.volume = Math.max(0, audio.volume - 0.3);
                  setTimeout(fadeAudio, 50);
                } else {
                  audio.volume = 0;
                  console.log('Audio faded out - video finished silently');
                }
              };
              fadeAudio();
            }

            // Limpar interval
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
          }
        }
      };

      interval = setInterval(checkVideoProgress, 200); // Menos frequente para melhor performance
    }

    return () => {
      if (skipTimer) clearTimeout(skipTimer);
      if (interval) clearInterval(interval);
    };
  }, [onComplete, videoStarted]);

  // Função removida - não mais necessária pois onEnded foi desabilitado
  // e agora usamos apenas a detecção por tempo na checkVideoProgress

  const handleSkip = () => {
    if (isTransitioning) return; // Prevenir skip durante transição

    console.log('User skipped intro');
    setIsTransitioning(true);
    setIsEnding(true);

    setTimeout(() => {
      onComplete();
    }, 200);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setIsLoaded(true);
  };

  const handleVideoError = (e: any) => {
    console.error('Video error:', e);
    // Se houver erro crítico, pular direto para a página
    setIsLoaded(true);
    setVideoReady(true);

    // Fallback: ir direto para página principal após erro
    setTimeout(() => {
      console.log('Video error - skipping to main page');
      onComplete();
    }, 2000);
  };

  const handleVideoCanPlay = () => {
    console.log('Video can play');
    setIsLoaded(true);
  };

  const handleVideoCanPlayThrough = () => {
    console.log('Video can play through - ready for smooth playback');
    setVideoReady(true);
  };

  const handleStartVideo = async () => {
    if (showButtonLoading || videoStarted) return; // Prevenir cliques múltiplos

    setShowButtonLoading(true);
    console.log('Starting video...');

    try {
      if (videoRef.current) {
        // Iniciar vídeo imediatamente
        setVideoStarted(true);
        await videoRef.current.play();
        console.log('Video started successfully');

        // Transição rápida da imagem para vídeo
        setTimeout(() => {
          setShowImage(false);
          setShowButtonLoading(false);
        }, 300);
      }
    } catch (error) {
      console.error('Error playing video:', error);

      // Fallback em caso de erro
      setVideoStarted(true);
      setShowImage(false);
      setShowButtonLoading(false);

      // Se ainda assim falhar, pular para a página
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black transition-all duration-800 ${
        isEnding ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Image - crossfade transition sem scale para evitar gaps */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-800 ease-out ${
          showImage ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: 'url(/images/video-background.png)',
          zIndex: 5,
          willChange: 'opacity'
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Video Element - sempre presente com opacity controlada */}
      <video
        ref={videoRef}
        muted={isMuted}
        playsInline
        preload="auto"
        // onEnded={handleVideoEnd} - REMOVIDO para evitar dupla transição
        onLoadedData={handleVideoLoad}
        onCanPlay={handleVideoCanPlay}
        onCanPlayThrough={handleVideoCanPlayThrough}
        onError={handleVideoError}
        onLoadStart={() => console.log('Video load started')}
        className={`w-full h-full object-cover transition-opacity duration-800 ease-out ${
          videoStarted && !showImage ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          zIndex: 1,
          position: 'absolute',
          top: 0,
          left: 0,
          willChange: 'opacity',
          transform: 'translateZ(0)' // GPU acceleration
        }}
      >
        <source src="/videos/Video_Generation_From_Description.mp4" type="video/mp4" />
        <source src="/videos/Video_Generation_From_Description.webm" type="video/webm" />
        {/* Fallback para navegadores que não suportam vídeo */}
        Seu navegador não suporta vídeos HTML5.
      </video>

      {/* Overlay escuro para melhor legibilidade */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Removido white flash - página principal vai sobrepor diretamente */}

      {/* Controls Container */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Skip Button - só aparece quando vídeo está rodando */}
        {showSkip && videoStarted && (
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all duration-300 flex items-center space-x-2 pointer-events-auto group transform hover:scale-105"
          >
            <span className="text-sm font-medium">Pular Intro</span>
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}

        {/* Mute/Unmute Button - aparece quando vídeo inicia */}
        {videoStarted && (
          <button
            onClick={toggleMute}
            className={`absolute bottom-6 left-6 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all duration-500 pointer-events-auto group transform hover:scale-105 ${
              !showImage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{
              zIndex: 20,
              willChange: 'transform, opacity',
              transform: 'translateZ(0)'
            }}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Progress Bar - aparece quando vídeo inicia */}
        {videoStarted && (
          <div
            className={`absolute bottom-0 left-0 w-full h-1 bg-white/20 transition-opacity duration-500 ${
              !showImage ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ zIndex: 15 }}
          >
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-100 video-progress"></div>
          </div>
        )}

        {/* Start Button - redesign moderno */}
        {showImage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" style={{ zIndex: 10 }}>
            <button
              onClick={handleStartVideo}
              disabled={showButtonLoading}
              className="group relative overflow-hidden transform hover:scale-105 transition-all duration-500 ease-out"
              style={{
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            >
              {showButtonLoading ? (
                // Loading state redesenhado
                <div className="relative px-10 py-5 bg-gradient-to-r from-blue-600/95 to-purple-600/95 backdrop-blur-xl border-2 border-white/40 rounded-2xl shadow-2xl shadow-blue-500/30">
                  {/* Shimmer effect durante loading */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-2xl" />

                  <div className="relative flex items-center space-x-4">
                    <div className="w-8 h-8 border-3 border-white/70 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-white font-bold text-lg">Iniciando experiência...</span>
                  </div>
                </div>
              ) : (
                // Botão normal redesenhado
                <div className="relative">
                  {/* Glow effect pulsante */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 animate-pulse transition-opacity duration-500"></div>

                  {/* Botão principal */}
                  <div className="relative px-10 py-5 bg-gradient-to-r from-blue-600/95 to-purple-600/95 backdrop-blur-xl border-2 border-white/40 rounded-2xl shadow-2xl shadow-blue-500/30 group-hover:shadow-purple-500/40 transition-all duration-500">

                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-300%] group-hover:translate-x-[300%] transition-transform duration-1000 ease-out rounded-2xl" />

                    {/* Breathing animation border */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/20 group-hover:border-white/40 transition-colors duration-500" />

                    {/* Conteúdo do botão */}
                    <div className="relative flex items-center space-x-4">
                      <div className="relative">
                        {/* Icon container com micro-animação */}
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 group-hover:rotate-12 transition-all duration-500">
                          <Play className="w-6 h-6 text-white ml-1 group-hover:scale-110 transition-transform duration-300" fill="currentColor" />
                        </div>

                        {/* Pulse ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping group-hover:animate-none"></div>
                      </div>

                      <div className="text-left">
                        <div className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
                          Entrar no EDC+
                        </div>
                        <div className="text-sm text-white/80 group-hover:text-white/90 transition-colors duration-300">
                          Mergulhe no futuro da educação
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Title Overlay - entrada cinematográfica */}
        {videoStarted && !showImage && (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-1000 ease-out ${
              !showImage ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{
              zIndex: 15,
              willChange: 'transform, opacity',
              transform: 'translateZ(0)'
            }}
          >
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 text-shadow-lg animate-pulse">
                EDC+
              </h1>
              <p className="text-lg md:text-xl text-white/80 animate-pulse">
                Mergulhe no futuro da educação
              </p>
            </div>
          </div>
        )}

        {/* Removido Page Preview - página principal será renderizada pelo page.tsx */}
      </div>

      <style jsx>{`
        .video-progress {
          animation: progress 6s linear forwards;
        }

        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }

        @keyframes portalFlash {
          0% {
            opacity: 0;
            transform: scale(0.8) rotate(0deg);
            filter: blur(0px);
          }
          25% {
            opacity: 0.8;
            transform: scale(1.1) rotate(1deg);
            filter: blur(2px);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(-1deg);
            filter: blur(1px);
          }
          100% {
            opacity: 1;
            transform: scale(1.5) rotate(0deg);
            filter: blur(0px);
          }
        }

        .text-shadow-lg {
          text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        }

        @keyframes pageReveal {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
            filter: blur(1px);
          }
          30% {
            opacity: 0.7;
            transform: translateY(10px) scale(0.99);
            filter: blur(0.5px);
          }
          60% {
            opacity: 0.9;
            transform: translateY(5px) scale(1);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
            filter: blur(0px);
          }
        }

        @keyframes subtleFlash {
          0% {
            opacity: 0;
          }
          40% {
            opacity: 0.3;
          }
          100% {
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  );
}