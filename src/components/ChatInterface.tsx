'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, X, Brain } from 'lucide-react';
import { ChatMessage, UploadedFile } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingProgress from './LoadingProgress';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, uploadedFiles?: UploadedFile[]) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
  // LoadingProgress props
  loadingProgress?: {
    currentStep: number;
    progress: number;
    isComplete?: boolean;
  };
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = 'Descreva sua área de estudo...',
  uploadedFiles = [],
  onRemoveFile,
  loadingProgress
}: ChatInterfaceProps) {
  const { isDarkMode } = useTheme();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    
    try {
      await onSendMessage(message, uploadedFiles);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className={`text-center mt-12 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className={`text-base font-medium mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>👋 Olá! Sou seu assistente educacional</h3>
            <p className={`text-sm mb-4 max-w-xs mx-auto ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Conte qual área você quer estudar e criarei um curso com aulas estruturadas, vídeos especializados e exercícios.</p>
            <div className="space-y-3 max-w-xs mx-auto">
              <div className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs ${
                isDarkMode
                  ? 'bg-gray-700/50 border border-gray-600/50'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className="text-blue-600">💡 Exemplo:</span>
              </div>
              <div className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs ${
                isDarkMode
                  ? 'bg-gray-700/50 border border-gray-600/50'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className={`${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>"Quero aprender Cálculo 1"</span>
              </div>
              <div className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs ${
                isDarkMode
                  ? 'bg-gray-700/50 border border-gray-600/50'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className={`${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>"Quero aprender a montar um drone."</span>
              </div>
              <div className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs ${
                isDarkMode
                  ? 'bg-gray-700/50 border border-gray-600/50'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className={`${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>"Quero aprender Programação"</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-100'
                      : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {/* Show attached files if any */}
                {message.attachedFiles && message.attachedFiles.length > 0 && (
                  <div className={`mt-2 pt-2 border-t border-opacity-20 ${
                    message.role === 'user' ? 'border-white' : isDarkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>
                    <div className="flex flex-wrap gap-1">
                      {message.attachedFiles.map((file) => (
                        <span
                          key={file.id}
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs ${
                            message.role === 'user'
                              ? 'bg-blue-500/50 backdrop-blur-sm'
                              : isDarkMode
                                ? 'bg-gray-700/80 backdrop-blur-sm border border-gray-600/50'
                                : 'bg-gray-100/80 backdrop-blur-sm border border-gray-200/50'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{file.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-center w-full my-6">
            {loadingProgress ? (
              <LoadingProgress
                currentStep={loadingProgress.currentStep}
                totalSteps={uploadedFiles.length > 0 ? 5 : 4}
                progress={loadingProgress.progress}
                isComplete={loadingProgress.isComplete}
                hasUploadedFiles={uploadedFiles.length > 0}
              />
            ) : (
              <div className={`rounded-xl px-4 py-3 backdrop-blur-lg shadow-sm ${
                isDarkMode
                  ? 'bg-gray-800/80 border border-gray-600/50'
                  : 'bg-white/80 border border-gray-200/50'
              }`}>
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Analisando sua solicitação...</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t p-4 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className={`mb-4 p-4 rounded-lg backdrop-blur-lg shadow-sm ${
            isDarkMode
              ? 'bg-gray-800/80 border border-gray-600/50'
              : 'bg-white/80 border border-gray-200/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                📎 {uploadedFiles.length} arquivo(s) anexado(s)
              </span>
              <span className={`text-xs px-3 py-1 rounded-full border ${
                isDarkMode
                  ? 'text-blue-300 bg-blue-900/60 border-blue-700/50'
                  : 'text-blue-700 bg-blue-100/80 border-blue-200/50'
              }`}>
                Serão enviados junto
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700/80 border border-gray-600/50'
                    : 'bg-gray-50/80 border border-gray-200/50'
                }`}>
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>{file.name}</p>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>{Math.round(file.size / 1024)} KB</p>
                    </div>
                  </div>
                  {onRemoveFile && (
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className={`ml-2 p-1.5 rounded-lg transition-colors border ${
                        isDarkMode
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30 border-red-700/50'
                          : 'text-red-600 hover:text-red-700 hover:bg-red-100/80 border-red-200/50'
                      }`}
                      title="Remover arquivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className={`mt-3 text-xs ${
              isDarkMode ? 'text-blue-300' : 'text-blue-700'
            }`}>
              🔗 Serão analisados junto com sua próxima mensagem
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className={`w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
}