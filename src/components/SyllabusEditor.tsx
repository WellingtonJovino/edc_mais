'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface SyllabusTopic {
  id: string;
  title: string;
  description?: string;
  estimatedDuration?: string;
  order: number;
  subtopics?: string[];
}

interface SyllabusModule {
  id: string;
  title: string;
  description?: string;
  topics: SyllabusTopic[];
  order: number;
  estimatedDuration?: string;
}

interface SyllabusData {
  title: string;
  description?: string;
  modules: SyllabusModule[];
  totalDuration?: string;
  level: string;
}

interface SyllabusEditorProps {
  syllabus: SyllabusData;
  onSyllabusUpdate: (updatedSyllabus: SyllabusData) => void;
  onCreateCourse: (finalSyllabus: SyllabusData) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

export default function SyllabusEditor({
  syllabus,
  onSyllabusUpdate,
  onCreateCourse,
  onCancel,
  isCreating = false
}: SyllabusEditorProps) {
  const [editingSyllabus, setEditingSyllabus] = useState<SyllabusData>(syllabus);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{type: 'module' | 'topic', id: string} | null>(null);
  const [editText, setEditText] = useState('');

  // Auto-expandir todos os módulos inicialmente
  useEffect(() => {
    setExpandedModules(new Set(editingSyllabus.modules.map(m => m.id)));
  }, [editingSyllabus.modules]);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const startEditing = (type: 'module' | 'topic', id: string, currentText: string) => {
    setEditingItem({type, id});
    setEditText(currentText);
  };

  const saveEdit = () => {
    if (!editingItem) return;

    const updatedSyllabus = { ...editingSyllabus };

    if (editingItem.type === 'module') {
      const moduleIndex = updatedSyllabus.modules.findIndex(m => m.id === editingItem.id);
      if (moduleIndex !== -1) {
        updatedSyllabus.modules[moduleIndex].title = editText.trim();
      }
    } else {
      // Encontrar o tópico em qualquer módulo
      for (const module of updatedSyllabus.modules) {
        const topicIndex = module.topics.findIndex(t => t.id === editingItem.id);
        if (topicIndex !== -1) {
          module.topics[topicIndex].title = editText.trim();
          break;
        }
      }
    }

    setEditingSyllabus(updatedSyllabus);
    onSyllabusUpdate(updatedSyllabus);
    setEditingItem(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditText('');
  };

  const deleteModule = (moduleId: string) => {
    const updatedSyllabus = {
      ...editingSyllabus,
      modules: editingSyllabus.modules.filter(m => m.id !== moduleId)
    };
    setEditingSyllabus(updatedSyllabus);
    onSyllabusUpdate(updatedSyllabus);
  };

  const deleteTopic = (moduleId: string, topicId: string) => {
    const updatedSyllabus = { ...editingSyllabus };
    const moduleIndex = updatedSyllabus.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      updatedSyllabus.modules[moduleIndex].topics =
        updatedSyllabus.modules[moduleIndex].topics.filter(t => t.id !== topicId);
    }
    setEditingSyllabus(updatedSyllabus);
    onSyllabusUpdate(updatedSyllabus);
  };

  const addTopic = (moduleId: string) => {
    const updatedSyllabus = { ...editingSyllabus };
    const moduleIndex = updatedSyllabus.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      const newTopic: SyllabusTopic = {
        id: `topic-${Date.now()}`,
        title: 'Novo Tópico',
        order: updatedSyllabus.modules[moduleIndex].topics.length + 1,
        estimatedDuration: '30 min',
        subtopics: [
          'Conceitos Fundamentais',
          'Aplicação Prática',
          'Exemplos e Exercícios'
        ]
      };
      updatedSyllabus.modules[moduleIndex].topics.push(newTopic);
    }
    setEditingSyllabus(updatedSyllabus);
    onSyllabusUpdate(updatedSyllabus);
  };

  const addModule = () => {
    const newModule: SyllabusModule = {
      id: `module-${Date.now()}`,
      title: 'Novo Módulo',
      topics: [],
      order: editingSyllabus.modules.length + 1,
      estimatedDuration: '2 horas'
    };
    const updatedSyllabus = {
      ...editingSyllabus,
      modules: [...editingSyllabus.modules, newModule]
    };
    setEditingSyllabus(updatedSyllabus);
    onSyllabusUpdate(updatedSyllabus);
  };

  const totalTopics = editingSyllabus.modules.reduce((sum, module) => sum + module.topics.length, 0);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Estrutura do Curso</h2>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{editingSyllabus.title}</h3>
            {editingSyllabus.description && (
              <p className="text-sm text-gray-600 mb-3">{editingSyllabus.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{editingSyllabus.modules.length} módulos</span>
              <span>{totalTopics} tópicos</span>
              <span className="capitalize">{editingSyllabus.level}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {editingSyllabus.modules.map((module, moduleIndex) => (
            <div key={module.id} className="border border-gray-200 rounded-lg">
              {/* Module Header */}
              <div className="bg-gray-50/50 p-3 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedModules.has(module.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {editingItem?.type === 'module' && editingItem.id === module.id ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          Módulo {moduleIndex + 1}
                        </span>
                        <h4 className="font-medium text-gray-900">{module.title}</h4>
                        <button
                          onClick={() => startEditing('module', module.id, module.title)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{module.topics.length} tópicos</span>
                    <button
                      onClick={() => deleteModule(module.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Module Topics */}
              {expandedModules.has(module.id) && (
                <div className="p-4 bg-gray-50/50">
                  <div className="space-y-3">
                    {module.topics.map((topic, topicIndex) => (
                      <div key={topic.id} className="group">
                        {editingItem?.type === 'topic' && editingItem.id === topic.id ? (
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-blue-600 min-w-[2rem]">
                              {moduleIndex + 1}.{topicIndex + 1}
                            </span>
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                              autoFocus
                            />
                            <button onClick={saveEdit} className="text-green-600 hover:text-green-700 p-1">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start space-x-3 flex-1">
                              <span className="text-sm font-semibold text-blue-600 min-w-[2rem] mt-0.5">
                                {moduleIndex + 1}.{topicIndex + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                                    {topic.title}
                                  </h4>
                                  <button
                                    onClick={() => startEditing('topic', topic.id, topic.title)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Subtópicos */}
                                {topic.subtopics && topic.subtopics.length > 0 && (
                                  <div className="mt-2 ml-4 space-y-1">
                                    {topic.subtopics.map((subtopic, subtopicIndex) => (
                                      <div key={subtopicIndex} className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500 font-medium min-w-[3rem]">
                                          {moduleIndex + 1}.{topicIndex + 1}.{subtopicIndex + 1}
                                        </span>
                                        <span className="text-xs text-gray-700">{subtopic}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {topic.estimatedDuration}
                              </span>
                              <button
                                onClick={() => deleteTopic(module.id, topic.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Topic Button */}
                    <button
                      onClick={() => addTopic(module.id)}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 bg-white"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Adicionar Tópico</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Module Button */}
          <button
            onClick={addModule}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Módulo</span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-200/50 bg-gray-50/30">
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right text-sm text-gray-500">
              <p>✨ Curso será gerado automaticamente</p>
              <p>🎯 {totalTopics} tópicos | {editingSyllabus.modules.length} módulos</p>
            </div>

            <button
              onClick={() => onCreateCourse(editingSyllabus)}
              disabled={isCreating || totalTopics === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Criando Curso...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Curso</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}