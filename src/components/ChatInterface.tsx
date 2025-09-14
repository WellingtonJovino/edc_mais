'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, X } from 'lucide-react';
import { ChatMessage, UploadedFile } from '@/types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, uploadedFiles?: UploadedFile[]) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = 'Descreva o que você gostaria de aprender...',
  uploadedFiles = [],
  onRemoveFile
}: ChatInterfaceProps) {
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
          <div className="text-center text-gray-500 mt-8">
            <h3 className="text-lg font-medium mb-2">Bem-vindo ao EDC+ Learning System!</h3>
            <p>Descreva o que você gostaria de aprender e eu vou criar um plano personalizado com os melhores vídeos do YouTube.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {/* Show attached files if any */}
                {message.attachedFiles && message.attachedFiles.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-opacity-20 border-white">
                    <div className="flex flex-wrap gap-1">
                      {message.attachedFiles.map((file) => (
                        <span
                          key={file.id}
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            message.role === 'user'
                              ? 'bg-primary-500 bg-opacity-50'
                              : 'bg-gray-100'
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
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                <span className="text-gray-600">Analisando sua solicitação...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                📎 {uploadedFiles.length} arquivo(s) anexado(s)
              </span>
              <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                Serão enviados junto
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-white p-2 rounded border">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</p>
                    </div>
                  </div>
                  {onRemoveFile && (
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Remover arquivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-blue-700">
              💡 Estes arquivos serão enviados junto com sua próxima mensagem
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {uploadedFiles.length > 0 ? `Enviar com ${uploadedFiles.length} arquivo(s)` : 'Enviar'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}