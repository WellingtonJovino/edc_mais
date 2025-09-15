'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, BookOpen, ExternalLink, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Prerequisite } from '@/types';

interface PrerequisitesSectionProps {
  prerequisites: Prerequisite[];
}

export default function PrerequisitesSection({ prerequisites }: PrerequisitesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!prerequisites || prerequisites.length === 0) {
    return null;
  }

  const essentialPrereqs = prerequisites.filter(p => p.importance === 'essential');
  const recommendedPrereqs = prerequisites.filter(p => p.importance === 'recommended');
  const optionalPrereqs = prerequisites.filter(p => p.importance === 'optional');

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'essential': return 'border-red-200 bg-red-50';
      case 'recommended': return 'border-yellow-200 bg-yellow-50';
      case 'optional': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'essential': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'recommended': return <Star className="w-4 h-4 text-yellow-600" />;
      case 'optional': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <BookOpen className="w-4 h-4 text-gray-600" />;
    }
  };

  const getImportanceLabel = (importance: string) => {
    switch (importance) {
      case 'essential': return 'Essencial';
      case 'recommended': return 'Recomendado';
      case 'optional': return 'Opcional';
      default: return importance;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Pré-requisitos</h3>
            <p className="text-sm text-gray-600">
              {essentialPrereqs.length > 0 && `${essentialPrereqs.length} essencial(is)`}
              {essentialPrereqs.length > 0 && (recommendedPrereqs.length > 0 || optionalPrereqs.length > 0) && ' • '}
              {recommendedPrereqs.length > 0 && `${recommendedPrereqs.length} recomendado(s)`}
              {recommendedPrereqs.length > 0 && optionalPrereqs.length > 0 && ' • '}
              {optionalPrereqs.length > 0 && `${optionalPrereqs.length} opcional(is)`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {essentialPrereqs.length > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              ⚠️ Verificar
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Warning for Essential Prerequisites */}
          {essentialPrereqs.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Conhecimentos Essenciais</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Estes conhecimentos são fundamentais para acompanhar o curso.
                    Recomendamos revisar antes de começar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Prerequisites by Category */}
          {[
            { category: 'essential', items: essentialPrereqs, title: 'Essenciais' },
            { category: 'recommended', items: recommendedPrereqs, title: 'Recomendados' },
            { category: 'optional', items: optionalPrereqs, title: 'Opcionais' }
          ].filter(group => group.items.length > 0).map(group => (
            <div key={group.category}>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                {getImportanceIcon(group.category)}
                <span>{group.title}</span>
              </h4>

              <div className="space-y-3">
                {group.items.map((prereq, index) => (
                  <div
                    key={prereq.id}
                    className={`border rounded-lg p-4 ${getImportanceColor(prereq.importance)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                          <span>{prereq.topic}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            prereq.importance === 'essential' ? 'bg-red-100 text-red-700' :
                            prereq.importance === 'recommended' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {getImportanceLabel(prereq.importance)}
                          </span>
                        </h5>
                        <p className="text-sm text-gray-700 mt-1">{prereq.description}</p>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500 ml-4">
                        <Clock className="w-4 h-4" />
                        <span>{prereq.estimatedTime}</span>
                      </div>
                    </div>

                    {/* Resources */}
                    {prereq.resources && prereq.resources.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Recursos recomendados:</p>
                        <div className="space-y-2">
                          {prereq.resources.map((resource, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${
                                resource.type === 'course' ? 'bg-blue-400' :
                                resource.type === 'video' ? 'bg-red-400' :
                                resource.type === 'article' ? 'bg-green-400' :
                                'bg-purple-400'
                              }`} />
                              <span className="font-medium">{resource.title}</span>
                              {resource.description && (
                                <span className="text-gray-500">- {resource.description}</span>
                              )}
                              {resource.url && (
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                💡 Use o chat do curso para tirar dúvidas sobre os pré-requisitos
              </p>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Minimizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}