'use client';

import { useState, useEffect } from 'react';
import { Brain, BookOpen, Star, Users, Sparkles, Zap, ArrowRight, Play, CheckCircle, MessageSquare, FileText, BarChart3, Target, Lightbulb, Code2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import VideoIntro from '@/components/VideoIntro';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();

  // Inicializar estados baseado se já viu a intro
  const hasSeenIntro = typeof window !== 'undefined' ? localStorage.getItem('hasSeenIntro') === 'true' : false;
  const [showIntro, setShowIntro] = useState(!hasSeenIntro);
  const [pageVisible, setPageVisible] = useState(hasSeenIntro);
  const [showVideoInBackground, setShowVideoInBackground] = useState(false);
  const [showBackgroundOverlay, setShowBackgroundOverlay] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Para desenvolvimento: adicione ?intro=true à URL para forçar o vídeo intro
    // Para limpar localStorage e sempre ver a intro: abra DevTools > Application > Local Storage > delete 'hasSeenIntro'
    const forceIntro = searchParams.get('intro') === 'true';

    if (forceIntro) {
      // Se ?intro=true na URL, sempre mostrar intro
      localStorage.removeItem('hasSeenIntro');
      setShowIntro(true);
      setPageVisible(false);
    } else {
      // Verificar se o usuário já viu a intro
      const hasSeenIntro = localStorage.getItem('hasSeenIntro');
      if (hasSeenIntro === 'true') {
        // Marcar intro como vista e mostrar página imediatamente
        localStorage.setItem('hasSeenIntro', 'true');
        setShowIntro(false);
        setPageVisible(true);
        setShowVideoInBackground(false);
        setShowBackgroundOverlay(false);
      }
    }

    // Garantir transição suave quando voltar de outras páginas
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.style.opacity = '1';
      mainElement.style.transition = 'opacity 300ms ease-in';
    }
  }, [searchParams]);

  const handleIntroComplete = () => {
    console.log('Video white flash detected - starting smooth transition');

    // Marcar que o usuário viu a intro
    localStorage.setItem('hasSeenIntro', 'true');

    // Passo 1: Background overlay aparece primeiro (cobre a parte branca rapidamente)
    setShowVideoInBackground(true);
    setShowBackgroundOverlay(true);

    // Passo 2: Após 200ms, página principal começa a surgir suavemente
    setTimeout(() => {
      setPageVisible(true);
    }, 200);

    // Passo 3: Após 3 segundos, remover o vídeo completamente (áudio já terá terminado)
    setTimeout(() => {
      setShowIntro(false);
      setShowVideoInBackground(false);
    }, 3000);
  };

  const handleGetStarted = () => {
    // Ativar loading
    setIsNavigating(true);

    // Adicionar animação de fade out
    const pageElement = document.querySelector('main');
    if (pageElement) {
      pageElement.style.transform = 'scale(0.95)';
      pageElement.style.opacity = '0';
      pageElement.style.transition = 'all 0.5s ease-out';
    }

    // Adicionar classe de transição ao body
    document.body.classList.add('page-transition-active');

    // Navegar após a animação
    setTimeout(() => {
      router.push('/chat');
    }, 300);
  };

  const handleExploreFeatures = () => {
    const recursosSection = document.getElementById('recursos');
    if (recursosSection) {
      recursosSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      {/* Vídeo Intro - renderizado quando necessário */}
      {showIntro && (
        <div className={`fixed inset-0 ${showVideoInBackground ? 'z-10' : 'z-[100]'}`}>
          <VideoIntro onComplete={handleIntroComplete} />
        </div>
      )}

      {/* Background Overlay - camada intermediária para transição suave */}
      {showBackgroundOverlay && (
        <div className="fixed inset-0 z-30 bg-[#000618] background-fade" />
      )}

      {/* Página Principal - sobrepõe o vídeo quando pageVisible */}
      {pageVisible && (
        <div className={`fixed inset-0 z-50 min-h-screen overflow-y-auto ${
          pageVisible ? 'smooth-page-reveal' : 'opacity-0'
        } ${
          isDarkMode
            ? 'bg-gradient-to-b from-[#000618] via-[#0a0f2e] via-[#0d1136] to-[#0f1540]'
            : 'bg-gradient-to-b from-blue-50 via-indigo-50 via-purple-50/80 to-cyan-50/70'
        }`}>

      {/* Background gradient overlay adicional para mais profundidade */}
      <div className={`fixed inset-0 pointer-events-none ${
        isDarkMode
          ? 'bg-gradient-to-br from-purple-900/15 via-transparent to-blue-900/15'
          : 'bg-gradient-to-br from-blue-100/20 via-transparent to-indigo-100/20'
      }`} />

      {/* Container de conteúdo */}
      <div className={`relative ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full filter blur-3xl animate-blob ${
          isDarkMode
            ? 'bg-purple-600 mix-blend-screen opacity-20'
            : 'bg-blue-300 mix-blend-normal opacity-30'
        }`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full filter blur-3xl animate-blob animation-delay-2000 ${
          isDarkMode
            ? 'bg-blue-600 mix-blend-screen opacity-20'
            : 'bg-indigo-300 mix-blend-normal opacity-25'
        }`} />
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full filter blur-3xl animate-blob animation-delay-4000 ${
          isDarkMode
            ? 'bg-indigo-600 mix-blend-screen opacity-10'
            : 'bg-cyan-300 mix-blend-normal opacity-20'
        }`} />
      </div>

      {/* Header/Navigation */}
      <header className={`relative z-50 backdrop-blur-sm ${
        isDarkMode
          ? 'border-b border-white/5'
          : 'border-b border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>EDC+ Plataforma Educacional</h1>
                <p className={`text-xs hidden sm:block ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Aqui, sua jornada de conhecimento começa com clareza.</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                href="/courses"
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 ${
                  isDarkMode
                    ? 'text-gray-300 hover:text-white glass border border-white/10'
                    : 'text-gray-700 hover:text-gray-900 bg-white/70 border border-gray-200/50 backdrop-blur-sm'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Meus Cursos</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Try Free Badge */}
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-8 backdrop-blur-sm ${
              isDarkMode
                ? 'glass border border-white/10'
                : 'bg-white/70 border border-gray-200/50'
            }`}>
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Guia</span>
            </div>

            {/* Main Heading - Tamanho otimizado */}
            <div className="mb-8">
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Transforme sua educação com
                <br />
                IA educacional, bem-vindo ao
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 glow-text animate-gradient-text">
                  edc+
                </span>
              </h1>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
              <button
                onClick={handleExploreFeatures}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105"
              >
                <span>Explorar recursos</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleGetStarted}
                disabled={isNavigating}
                className={`w-full sm:w-auto px-8 py-4 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-lg transform hover:scale-105 backdrop-blur-sm disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${
                  isDarkMode
                    ? 'glass text-white border border-white/20 hover:shadow-purple-500/25'
                    : 'bg-white/80 text-blue-600 border border-blue-200 hover:bg-white hover:shadow-blue-500/25'
                }`}
              >
                {isNavigating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>{isNavigating ? 'Carregando...' : 'Começar agora'}</span>
              </button>
            </div>

            {/* Dashboard Preview Images */}
            <div className="relative max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Dashboard Card 1 */}
                <div className={`rounded-xl p-4 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 backdrop-blur-sm ${
                  isDarkMode
                    ? 'glass border border-white/10'
                    : 'bg-white/80 border border-gray-200/50'
                }`}>
                  <div className={`aspect-video rounded-lg flex items-center justify-center ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-blue-900/50 to-purple-900/50'
                      : 'bg-gradient-to-br from-blue-100/80 to-purple-100/80'
                  }`}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Brain className="w-8 h-8 text-white" />
                      </div>
                      <h3 className={`text-sm font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>Chatbot AI</h3>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Assistente inteligente</p>
                    </div>
                  </div>
                </div>

                {/* Dashboard Card 2 */}
                <div className={`rounded-xl p-4 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 backdrop-blur-sm ${
                  isDarkMode
                    ? 'glass border border-white/10'
                    : 'bg-white/80 border border-gray-200/50'
                }`}>
                  <div className={`aspect-video rounded-lg flex items-center justify-center ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/50'
                      : 'bg-gradient-to-br from-purple-100/80 to-pink-100/80'
                  }`}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <h3 className={`text-sm font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>Análise de Dados</h3>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Insights em tempo real</p>
                    </div>
                  </div>
                </div>

                {/* Dashboard Card 3 */}
                <div className={`rounded-xl p-4 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 backdrop-blur-sm ${
                  isDarkMode
                    ? 'glass border border-white/10'
                    : 'bg-white/80 border border-gray-200/50'
                }`}>
                  <div className={`aspect-video rounded-lg flex items-center justify-center ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-indigo-900/50 to-blue-900/50'
                      : 'bg-gradient-to-br from-indigo-100/80 to-blue-100/80'
                  }`}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <h3 className={`text-sm font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>Conteúdo Estruturado</h3>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Cursos completos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: A forma mais inteligente de criar seus cursos */}
      <section className="relative py-20 overflow-hidden">
        {/* Linha divisória decorativa com gradiente azul iluminado */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-px">
          <div className={`h-full ${
            isDarkMode
              ? 'bg-gradient-to-r from-transparent via-blue-500/60 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.5)]'
              : 'bg-gradient-to-r from-transparent via-blue-400/50 to-transparent shadow-[0_0_8px_rgba(96,165,250,0.4)]'
          }`} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              A forma mais inteligente de
              <br />
              criar seus cursos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="glass rounded-2xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/50">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="text-blue-400 text-sm font-semibold mb-2">01</div>
              <h3 className="text-xl font-semibold mb-3">Descreva seu interesse</h3>
              <p className="text-gray-400 text-sm">
                Basta informar o assunto que deseja aprender e nossas IAs automaticamente mapeiam objetivos de aprendizado e criam a estrutura ideal do curso.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass rounded-2xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/50">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="text-purple-400 text-sm font-semibold mb-2">02</div>
              <h3 className="text-xl font-semibold mb-3">IA estrutura & personaliza</h3>
              <p className="text-gray-400 text-sm">
                A IA organiza módulos, tópicos e conteúdo baseados em metodologias pedagógicas validadas cientificamente.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass rounded-2xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/50">
                <Zap className="w-8 h-8" />
              </div>
              <div className="text-green-400 text-sm font-semibold mb-2">03</div>
              <h3 className="text-xl font-semibold mb-3">Aprenda instantaneamente</h3>
              <p className="text-gray-400 text-sm">
                Receba aulas completas, exercícios adaptativos e acompanhe seu progresso em tempo real para maximizar seu aprendizado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Recursos avançados de IA */}
      <section id="recursos" className="relative py-20 overflow-hidden">
        {/* Linha divisória decorativa com gradiente azul iluminado */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-px">
          <div className={`h-full ${
            isDarkMode
              ? 'bg-gradient-to-r from-transparent via-blue-500/60 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.5)]'
              : 'bg-gradient-to-r from-transparent via-blue-400/50 to-transparent shadow-[0_0_8px_rgba(96,165,250,0.4)]'
          }`} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Recursos avançados de IA para
              <br />
              educação personalizada
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="glass rounded-xl p-6 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Análise pedagógica</h4>
              <p className="text-sm text-gray-400">
                Análise automática de conteúdos educacionais seguindo metodologias pedagógicas validadas.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Geração de conteúdo</h4>
              <p className="text-sm text-gray-400">
                Criação automática de aulas, exercícios e avaliações adaptadas ao seu nível.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass rounded-xl p-6 hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Personalização inteligente</h4>
              <p className="text-sm text-gray-400">
                Cursos adaptados ao seu perfil, objetivos e ritmo de aprendizagem.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass rounded-xl p-6 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Avaliação integrativa</h4>
              <p className="text-sm text-gray-400">
                Sistema de avaliação contínua que identifica pontos fortes e áreas para melhoria.
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-16">
            <button
              onClick={handleGetStarted}
              disabled={isNavigating}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 inline-flex items-center space-x-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span>{isNavigating ? 'Carregando...' : 'Começar agora'}</span>
              {isNavigating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden">
        {/* Linha divisória decorativa com gradiente azul iluminado */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-px">
          <div className={`h-full ${
            isDarkMode
              ? 'bg-gradient-to-r from-transparent via-blue-500/60 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.5)]'
              : 'bg-gradient-to-r from-transparent via-blue-400/50 to-transparent shadow-[0_0_8px_rgba(96,165,250,0.4)]'
          }`} />
        </div>
        <div className={`backdrop-blur-sm ${
          isDarkMode ? 'bg-black/20' : 'bg-gray-50/50'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">EDC+ Plataforma Educacional</h3>
                  <p className="text-gray-400 text-sm">Aqui, sua jornada de conhecimento começa com clareza.</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Transformamos a educação através da inteligência artificial, criando experiências de aprendizado personalizadas.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/chat" className="hover:text-white transition-colors">Criar Curso</Link></li>
                <li><Link href="/courses" className="hover:text-white transition-colors">Meus Cursos</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Recursos</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contato</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 EDC+ Plataforma Educacional. Todos os direitos reservados.
            </p>
          </div>
        </div>
        </div>
      </footer>
      </div>
        </div>
      )}
    </div>
  );
}