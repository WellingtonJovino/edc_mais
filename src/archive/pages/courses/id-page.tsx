'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourse, type Course } from '@/lib/supabase';
import RespondeAiCourseLayout from '@/components/RespondeAi/CourseLayout';
import CourseChat from '@/components/CourseChat';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatContext, setChatContext] = useState<{ section: string; content: string } | null>(null);

  useEffect(() => {
    if (params.id) {
      loadCourse(params.id as string);
    }
  }, [params.id]);

  const loadCourse = async (id: string) => {
    try {
      setLoading(true);
      const courseData = await getCourse(id);
      if (!courseData) {
        router.push('/courses');
        return;
      }
      setCourse(courseData);
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseUpdate = (updatedCourse: Course) => {
    setCourse(updatedCourse);
  };

  const handleDoubtClick = (section: string, content: string) => {
    setChatContext({ section, content });
    setShowChat(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Curso não encontrado</h3>
          <Link href="/courses" className="text-teal-600 hover:text-teal-700">
            ← Voltar aos cursos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <RespondeAiCourseLayout
        course={course}
        onCourseUpdate={handleCourseUpdate}
        onDoubtClick={handleDoubtClick}
      />

      {/* Chat Interativo */}
      {showChat && (
        <CourseChat
          courseId={course.id}
          courseTitle={course.title}
          currentTopic={chatContext ? {
            id: 'doubt-section',
            title: chatContext.section
          } : undefined}
        />
      )}
    </>
  );
}