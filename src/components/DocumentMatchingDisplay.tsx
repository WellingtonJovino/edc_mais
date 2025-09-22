'use client';

import { EnhancedCourseStructure, ProcessedFile } from '@/types';
import { FileText, Link, Plus, AlertCircle, CheckCircle, Minus } from 'lucide-react';

interface DocumentMatchingDisplayProps {
  enhancedStructure: EnhancedCourseStructure;
  processedFiles: ProcessedFile[];
  onViewChunk?: (fileId: string, chunkId: string) => void;
}

export default function DocumentMatchingDisplay({
  enhancedStructure,
  processedFiles,
  onViewChunk
}: DocumentMatchingDisplayProps) {

  const getMatchTypeIcon = (matchType: 'strong' | 'weak' | 'none') => {
    switch (matchType) {
      case 'strong':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'weak':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMatchTypeBadge = (matchType: 'strong' | 'weak' | 'none') => {
    const colors = {
      strong: 'bg-green-100 text-green-800 border-green-200',
      weak: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      none: 'bg-gray-100 text-gray-600 border-gray-200'
    };

    const labels = {
      strong: 'Match Forte',
      weak: 'Match Parcial',
      none: 'Sem Match'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colors[matchType]}`}>
        {getMatchTypeIcon(matchType)}
        {labels[matchType]}
      </span>
    );
  };

  const getFileName = (fileId: string) => {
    const file = processedFiles.find(f => f.id === fileId);
    return file?.name || 'Arquivo não encontrado';
  };

  const stats = {
    totalTopics: enhancedStructure.course.modules.reduce((sum, module) => sum + module.topics.length, 0),
    matchedTopics: Object.keys(enhancedStructure.documentMatches).length,
    newTopics: enhancedStructure.documentDerivedTopics.length,
    unmatchedTopics: enhancedStructure.unmatchedTopics.length,
    strongMatches: Object.values(enhancedStructure.documentMatches).filter(match => match.matchType === 'strong').length,
    weakMatches: Object.values(enhancedStructure.documentMatches).filter(match => match.matchType === 'weak').length
  };

  const matchPercentage = stats.totalTopics > 0 ? Math.round((stats.matchedTopics / stats.totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Integração com Documentos
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalTopics}</div>
            <div className="text-sm text-gray-600">Tópicos Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.matchedTopics}</div>
            <div className="text-sm text-gray-600">Com Documentos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.newTopics}</div>
            <div className="text-sm text-gray-600">Novos Tópicos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.unmatchedTopics}</div>
            <div className="text-sm text-gray-600">Sem Match</div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Cobertura por Documentos</span>
            <span>{matchPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        </div>

        {/* Breakdown de Matches */}
        <div className="flex flex-wrap gap-2">
          {stats.strongMatches > 0 && getMatchTypeBadge('strong')}
          {stats.weakMatches > 0 && getMatchTypeBadge('weak')}
          {stats.unmatchedTopics > 0 && getMatchTypeBadge('none')}
        </div>
      </div>

      {/* Tópicos com Matches */}
      {stats.matchedTopics > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Link className="w-4 h-4 text-green-600" />
            Tópicos Integrados com Documentos ({stats.matchedTopics})
          </h4>

          <div className="space-y-3">
            {enhancedStructure.course.modules.map(module => {
              const moduleMatches = module.topics.filter(topic =>
                enhancedStructure.documentMatches[topic.id]
              );

              if (moduleMatches.length === 0) return null;

              return (
                <div key={module.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-2">{module.title}</div>

                  <div className="space-y-2">
                    {moduleMatches.map(topic => {
                      const match = enhancedStructure.documentMatches[topic.id];

                      return (
                        <div key={topic.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">{topic.title}</div>
                              <div className="text-xs text-gray-600 mt-1">{topic.description}</div>
                            </div>
                            <div className="flex-shrink-0">
                              {getMatchTypeBadge(match.matchType)}
                            </div>
                          </div>

                          {/* Fontes dos Documentos */}
                          {match.documentSources.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {match.documentSources.map((source, idx) => (
                                <div key={idx} className="bg-white rounded border border-gray-200 p-2">
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    📄 {getFileName(source.fileId)}
                                  </div>
                                  {source.chunks.length > 0 && (
                                    <div className="text-xs text-gray-600">
                                      {source.chunks.length} trecho(s) relevante(s)
                                      {source.chunks.slice(0, 1).map((chunk, chunkIdx) => (
                                        <div key={chunkIdx} className="mt-1 italic">
                                          "{chunk.text.substring(0, 100)}..."
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Novos Tópicos Derivados */}
      {stats.newTopics > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Novos Tópicos dos Documentos ({stats.newTopics})
          </h4>

          <div className="space-y-3">
            {enhancedStructure.documentDerivedTopics.map((derivedTopic, idx) => {
              const module = enhancedStructure.course.modules.find(m => m.id === derivedTopic.moduleId);

              return (
                <div key={idx} className="border border-blue-100 bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Plus className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{derivedTopic.topic.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{derivedTopic.topic.description}</div>

                      {module && (
                        <div className="text-xs text-blue-600 mt-2">
                          Adicionado ao módulo: {module.title}
                        </div>
                      )}

                      {/* Fontes dos Chunks */}
                      {derivedTopic.sourceChunks.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-700 mb-1">
                            Baseado em {derivedTopic.sourceChunks.length} trecho(s):
                          </div>
                          <div className="space-y-1">
                            {derivedTopic.sourceChunks.slice(0, 2).map((chunk, chunkIdx) => (
                              <div key={chunkIdx} className="text-xs text-gray-600 italic">
                                📄 {getFileName(chunk.fileId)}: "{chunk.text.substring(0, 80)}..."
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tópicos sem Match */}
      {stats.unmatchedTopics > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-600" />
            Tópicos sem Documentos ({stats.unmatchedTopics})
          </h4>

          <div className="text-sm text-gray-600 mb-3">
            Estes tópicos não têm conteúdo correspondente nos documentos enviados.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {enhancedStructure.unmatchedTopics.map((unmatchedTopic, idx) => {
              const topic = enhancedStructure.course.modules
                .flatMap(m => m.topics)
                .find(t => t.id === unmatchedTopic.topicId);

              return (
                <div key={idx} className="bg-gray-50 rounded p-3 border border-gray-200">
                  <div className="font-medium text-gray-900 text-sm">{unmatchedTopic.title}</div>
                  {topic && (
                    <div className="text-xs text-gray-600 mt-1">{topic.description}</div>
                  )}
                  {unmatchedTopic.needsExternalContent && (
                    <div className="text-xs text-amber-600 mt-1">
                      💡 Necessário buscar conteúdo externo
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo dos Arquivos Processados */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          Documentos Processados ({processedFiles.length})
        </h4>

        <div className="space-y-2">
          {processedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">{file.name}</div>
                  <div className="text-xs text-gray-600">
                    {file.chunks.length} chunks • {file.extractedTopics.length} tópicos extraídos
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(file.size / 1024)}KB
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}