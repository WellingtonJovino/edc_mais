'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Brain, Youtube } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import LearningPlan from '@/components/LearningPlan';
import { LearningPlan as LearningPlanType, ChatMessage } from '@/types';

export default function HomePage() {
  const [currentPlan, setCurrentPlan] = useState<LearningPlanType | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentPlan(data.plan);
        setMessages(data.plan.messages);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicComplete = async (topicId: string, completed: boolean) => {
    if (!currentPlan) return;

    try {
      const response = await fetch(`/api/plans/${currentPlan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_topic_progress',
          data: { topicId, completed },
        }),
      });

      if (response.ok) {
        const updatedPlan = await response.json();
        setCurrentPlan(updatedPlan);
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EDC+ Learning System</h1>
                <p className="text-sm text-gray-600">Aprendizado personalizado com IA</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <BookOpen className="w-4 h-4" />
                <span>ChatGPT</span>
              </div>
              <div className="flex items-center space-x-1">
                <Youtube className="w-4 h-4" />
                <span>YouTube API</span>
              </div>
              <div className="flex items-center space-x-1">
                <Brain className="w-4 h-4" />
                <span>Supabase</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
          {/* Chat Panel */}
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Conversa com IA</h2>
              <p className="text-sm text-gray-600">
                Descreva o que você quer aprender e receba um plano personalizado
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder="Ex: Quero aprender React do zero..."
              />
            </div>
          </div>

          {/* Learning Plan Panel */}
          <div className="bg-gray-50 rounded-lg p-4 overflow-y-auto">
            {currentPlan ? (
              <LearningPlan
                goal={currentPlan.goal}
                onTopicComplete={handleTopicComplete}
                progress={currentPlan.progress}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div className="max-w-md">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum plano ainda
                  </h3>
                  <p className="text-gray-600">
                    Converse com a IA sobre o que você quer aprender e ela criará um plano 
                    personalizado com os melhores vídeos do YouTube organizados por tópicos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}