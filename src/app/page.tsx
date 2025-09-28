'use client';

import { useState, useEffect } from 'react';
import { Brain, BookOpen, Star, Users, Sparkles, Zap, ArrowRight, Play, CheckCircle, MessageSquare, FileText, BarChart3, Target, Lightbulb, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import VideoIntro from '@/components/VideoIntro';

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showIntro, setShowIntro] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);
  const [showVideoInBackground, setShowVideoInBackground] = useState(false);
  const [showBackgroundOverlay, setShowBackgroundOverlay] = useState(false);

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
        setShowIntro(false);
        setPageVisible(true);
      }
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
    router.push('/chat');
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
        <div className={`fixed inset-0 z-50 min-h-screen bg-[#000618] text-white overflow-y-auto ${
          pageVisible ? 'smooth-page-reveal' : 'opacity-0'
        }`}>
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 pointer-events-none" />

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      {/* Header/Navigation */}
      <header className="relative z-50 border-b border-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">EDC+ Plataforma Educacional</h1>
                <p className="text-xs text-gray-400 hidden sm:block">Ensino superior personalizado com IA científica</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <Link
                href="/courses"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white glass rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/25"
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
            <div className="inline-flex items-center space-x-2 px-4 py-2 glass rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Try Free</span>
            </div>

            {/* Main Heading */}
            <div className="mb-8">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
                Transforme sua educação com
                <br />
                IA educacional, bem-vindo ao
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 glow-text">
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
                className="w-full sm:w-auto px-8 py-4 glass text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 border border-white/20"
              >
                <Play className="w-5 h-5" />
                <span>Começar agora</span>
              </button>
            </div>

            {/* Dashboard Preview Images */}
            <div className="relative max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Dashboard Card 1 */}
                <div className="glass rounded-xl p-4 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
                  <div className="aspect-video bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Brain className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1">Chatbot AI</h3>
                      <p className="text-xs text-gray-400">Assistente inteligente</p>
                    </div>
                  </div>
                </div>

                {/* Dashboard Card 2 */}
                <div className="glass rounded-xl p-4 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
                  <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BarChart3 className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1">Análise de Dados</h3>
                      <p className="text-xs text-gray-400">Insights em tempo real</p>
                    </div>
                  </div>
                </div>

                {/* Dashboard Card 3 */}
                <div className="glass rounded-xl p-4 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20">
                  <div className="aspect-video bg-gradient-to-br from-indigo-900/50 to-blue-900/50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1">Conteúdo Estruturado</h3>
                      <p className="text-xs text-gray-400">Cursos completos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: A forma mais inteligente de criar seus cursos */}
      <section className="relative py-20 border-t border-white/5">
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

          {/* Central Text */}
          <div className="text-center mt-12">
            <p className="text-gray-400">
              <span className="text-white font-semibold">Prof. Ana Silva</span>, Especialista em Educação Digital
            </p>
          </div>
        </div>
      </section>

      {/* Section: Recursos avançados de IA */}
      <section id="recursos" className="relative py-20 border-t border-white/5">
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
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 inline-flex items-center space-x-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105"
            >
              <span>Começar agora</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Validation Badge */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-400">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Estrutura curricular cientificamente validada</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">EDC+ Plataforma Educacional</h3>
                  <p className="text-gray-400 text-sm">Ensino superior personalizado com IA científica</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Transformamos a educação através da inteligência artificial, criando experiências de aprendizado personalizadas e cientificamente validadas.
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
              © 2024 EDC+ Plataforma Educacional. Todos os direitos reservados.
            </p>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0 text-sm">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Prof. Ana Silva, Especialista em Educação Digital
              </Link>
            </div>
          </div>
        </div>
      </footer>
        </div>
      )}
    </div>
  );
}