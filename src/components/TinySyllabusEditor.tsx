'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';

interface SyllabusData {
  title: string;
  description?: string;
  level: string;
  modules: Array<{
    id: string;
    title: string;
    description?: string;
    order: number;
    estimatedDuration?: string;
    topics: Array<{
      id: string;
      title: string;
      description?: string;
      order: number;
      estimatedDuration?: string;
      subtopics?: string[];
    }>;
  }>;
  totalDuration?: string;
}

interface TinySyllabusEditorProps {
  syllabus: SyllabusData;
  onSyllabusUpdate: (updatedSyllabus: SyllabusData) => void;
  onCreateCourse: (finalSyllabus: SyllabusData) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

export default function TinySyllabusEditor({
  syllabus,
  onSyllabusUpdate,
  onCreateCourse,
  onCancel,
  isCreating = false
}: TinySyllabusEditorProps) {
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState('');
  const [apiKey, setApiKey] = useState('7i561pdhiavj8ahbfaaftp6r78g5h252zvir5aqy493tszno'); // Substitua por sua API key real

  // Converter syllabus para HTML estruturado
  const syllabusToHtml = (syllabusData: SyllabusData) => {
    let html = `
      <h1>${syllabusData.title}</h1>
    `;

    syllabusData.modules.forEach((module, moduleIndex) => {
      html += `
        <h2>${moduleIndex + 1}. ${module.title}</h2>
        <ol>
      `;

      module.topics.forEach((topic, topicIndex) => {
        html += `
          <li>
            <strong>${topic.title}</strong>
        `;

        if (topic.subtopics && topic.subtopics.length > 0) {
          html += '<ol type="a">';
          topic.subtopics.forEach(subtopic => {
            html += `<li>${subtopic}</li>`;
          });
          html += '</ol>';
        }

        html += '</li>';
      });

      html += '</ol>';
    });

    return html;
  };

  // Converter HTML de volta para syllabus
  const htmlToSyllabus = (html: string): SyllabusData => {
    // Esta é uma implementação simplificada
    // Em um caso real, seria melhor usar um parser HTML mais robusto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const title = tempDiv.querySelector('h1')?.textContent || syllabus.title;
    const description = tempDiv.querySelector('p em')?.textContent || syllabus.description;

    return {
      ...syllabus,
      title,
      description,
      // Por simplicidade, mantemos a estrutura original dos módulos
      // Em uma implementação completa, parseariamos o HTML para extrair mudanças
    };
  };

  // Inicializar conteúdo quando o syllabus mudar
  useEffect(() => {
    const htmlContent = syllabusToHtml(syllabus);
    setContent(htmlContent);
  }, [syllabus]);

  const handleEditorChange = (content: string) => {
    setContent(content);

    // Atualizar syllabus baseado no conteúdo editado
    try {
      const updatedSyllabus = htmlToSyllabus(content);
      onSyllabusUpdate(updatedSyllabus);
    } catch (error) {
      console.warn('Erro ao converter HTML para syllabus:', error);
    }
  };

  const handleCreateCourse = () => {
    if (editorRef.current) {
      const finalContent = editorRef.current.getContent();
      const finalSyllabus = htmlToSyllabus(finalContent);
      onCreateCourse(finalSyllabus);
    }
  };

  const totalTopics = syllabus.modules.reduce((sum, module) => sum + module.topics.length, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Editor */}
      <div className="flex-1">
        <Editor
          ref={editorRef}
          apiKey={apiKey || "no-api-key"}
          value={content}
          onEditorChange={handleEditorChange}
          init={{
            height: 500,
            menubar: false,
            plugins: [
              'lists', 'link', 'autolink', 'searchreplace', 'visualblocks',
              'code', 'fullscreen', 'insertdatetime', 'media', 'table',
              'help', 'wordcount', 'paste'
            ],
            toolbar: 'undo redo | bold italic | numlist bullist | outdent indent | removeformat | help',
            content_style: `
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                max-width: none;
                margin: 1rem;
                color: #374151;
              }
              h1 {
                color: #1f2937;
                font-size: 20px;
                font-weight: 600;
                margin: 0 0 16px 0;
              }
              h2 {
                color: #1f2937;
                font-size: 16px;
                font-weight: 600;
                margin: 16px 0 8px 0;
              }
              ol {
                margin: 0 0 16px 0;
                padding-left: 20px;
              }
              ol ol {
                margin: 4px 0 4px 0;
              }
              li {
                margin-bottom: 4px;
                line-height: 1.5;
              }
              p {
                margin: 0 0 8px 0;
                color: #6b7280;
              }
              strong {
                font-weight: 600;
                color: #1f2937;
              }
            `,
            paste_data_images: true,
            paste_as_text: false,
            smart_paste: true,
            automatic_uploads: true,
            file_picker_types: 'image',
            setup: (editor: any) => {
              editor.on('init', () => {
                console.log('TinyMCE Editor initialized');
              });
            },
            branding: false,
            promotion: false,
            statusbar: true,
            resize: 'vertical',
            min_height: 400,
            max_height: 600
          }}
        />
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-center">
          <button
            onClick={handleCreateCourse}
            disabled={isCreating}
            className="w-full max-w-md flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Criando Curso...</span>
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                <span>Gerar Curso</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}