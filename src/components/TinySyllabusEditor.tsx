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
  onCancel: () => void;
}

export default function TinySyllabusEditor({
  syllabus,
  onSyllabusUpdate,
  onCancel
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
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const title = tempDiv.querySelector('h1')?.textContent || syllabus.title;
    const description = tempDiv.querySelector('p em')?.textContent || syllabus.description;

    // Extrair módulos do HTML
    const modules: SyllabusData['modules'] = [];
    const h2Elements = tempDiv.querySelectorAll('h2');

    h2Elements.forEach((h2, moduleIndex) => {
      const moduleTitle = h2.textContent || '';

      // Encontrar a lista ordenada que vem logo após o h2
      let nextElement = h2.nextElementSibling;
      while (nextElement && nextElement.tagName !== 'OL' && nextElement.tagName !== 'H2') {
        nextElement = nextElement.nextElementSibling;
      }

      const topics: SyllabusData['modules'][0]['topics'] = [];

      if (nextElement && nextElement.tagName === 'OL') {
        const liElements = nextElement.querySelectorAll(':scope > li');

        liElements.forEach((li, topicIndex) => {
          const topicTitle = li.childNodes[0]?.textContent?.trim() || '';
          const strongElement = li.querySelector('strong');
          const finalTopicTitle = strongElement ? strongElement.textContent || '' : topicTitle;

          // Extrair subtópicos se existirem
          const subtopics: string[] = [];
          const subOl = li.querySelector('ol[type="a"]');

          if (subOl) {
            const subLiElements = subOl.querySelectorAll('li');
            subLiElements.forEach(subLi => {
              const subtopicText = subLi.textContent?.trim();
              if (subtopicText) {
                subtopics.push(subtopicText);
              }
            });
          }

          topics.push({
            id: `topic-${moduleIndex}-${topicIndex}`,
            title: finalTopicTitle,
            description: '',
            order: topicIndex + 1,
            estimatedDuration: '45 min',
            subtopics: subtopics.length > 0 ? subtopics : undefined
          });
        });
      }

      // Extrair o número do módulo e o título
      const cleanTitle = moduleTitle.replace(/^\d+\.\s*/, '');

      modules.push({
        id: `module-${moduleIndex}`,
        title: cleanTitle,
        description: '',
        order: moduleIndex + 1,
        estimatedDuration: '2-3 semanas',
        topics
      });
    });

    return {
      ...syllabus,
      title,
      description,
      modules: modules.length > 0 ? modules : syllabus.modules
    };
  };

  // Inicializar conteúdo quando o syllabus mudar
  useEffect(() => {
    const htmlContent = syllabusToHtml(syllabus);
    setContent(htmlContent);
  }, [syllabus]);

  const handleEditorChange = (content: string) => {
    setContent(content);

    // Tentar atualizar o syllabus, mas sem validações restritivas
    try {
      const updatedSyllabus = htmlToSyllabus(content);
      onSyllabusUpdate(updatedSyllabus);
    } catch (error) {
      // Em caso de erro, apenas log - não bloquear edição
      console.warn('Erro ao processar conteúdo editado:', error);
    }
  };


  const totalTopics = syllabus.modules.reduce((sum, module) => sum + module.topics.length, 0);

  return (
    <div className="h-full">
      <Editor
        ref={editorRef}
        apiKey={apiKey || "no-api-key"}
        value={content}
        onEditorChange={handleEditorChange}
        init={{
          height: '100%',
          menubar: false,
          plugins: [
            'lists', 'link', 'autolink', 'searchreplace', 'visualblocks',
            'code', 'fullscreen', 'insertdatetime', 'media', 'table',
            'help', 'wordcount', 'paste', 'charmap', 'preview', 'anchor',
            'textcolor', 'colorpicker'
          ],
          toolbar: 'undo redo | formatselect | bold italic underline | alignleft aligncenter alignright alignjustify | numlist bullist | outdent indent | removeformat | addModule addTopic | code help',
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
          // Configurações essenciais para funcionamento correto
          forced_root_block: 'p',
          newline_behavior: 'default',
          entity_encoding: 'raw',
          extended_valid_elements: '*[*]',
          valid_children: '+body[style]',
          convert_newlines_to_brs: false,
          remove_linebreaks: false,
          force_br_newlines: false,
          force_p_newlines: true,

          // Configurações de paste e upload
          paste_data_images: true,
          paste_as_text: false,
          smart_paste: true,
          automatic_uploads: true,
          file_picker_types: 'image',
          setup: (editor: any) => {
            editor.on('init', () => {
              console.log('TinyMCE Editor initialized');
            });

            // Adicionar comandos customizados para facilitar edição de estrutura
            editor.ui.registry.addButton('addModule', {
              text: 'Adicionar Módulo',
              onAction: () => {
                const content = editor.getContent();
                const moduleNumber = (content.match(/<h2>/g) || []).length + 1;
                const newModule = `<h2>${moduleNumber}. Novo Módulo</h2><ol><li><strong>Novo Tópico</strong></li></ol>`;
                editor.execCommand('mceInsertContent', false, newModule);
              }
            });

            editor.ui.registry.addButton('addTopic', {
              text: 'Adicionar Tópico',
              onAction: () => {
                editor.execCommand('mceInsertContent', false, '<li><strong>Novo Tópico</strong></li>');
              }
            });
          },
          branding: false,
          promotion: false,
          statusbar: true,
          min_height: 300,
          resize: false
        }}
      />
    </div>
  );
}