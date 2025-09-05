'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Play, Clock, User } from 'lucide-react';
import { LearningGoal, Topic, YouTubeVideo } from '@/types';
import Image from 'next/image';

interface LearningPlanProps {
  goal: LearningGoal;
  onTopicComplete: (topicId: string, completed: boolean) => void;
  progress: number;
}

export default function LearningPlan({ goal, onTopicComplete, progress }: LearningPlanProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const toggleTopic = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  const handleTopicToggle = (topicId: string, completed: boolean) => {
    onTopicComplete(topicId, completed);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900">{goal.title}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            goal.level === 'beginner' ? 'bg-green-100 text-green-800' :
            goal.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {goal.level === 'beginner' ? 'Iniciante' :
             goal.level === 'intermediate' ? 'Intermediário' : 'Avançado'}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4">{goal.description}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{Math.round(progress)}% concluído</p>
      </div>

      {/* Topics */}
      <div className="space-y-4">
        {goal.topics
          .sort((a, b) => a.order - b.order)
          .map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              isExpanded={expandedTopic === topic.id}
              onToggle={() => toggleTopic(topic.id)}
              onComplete={(completed) => handleTopicToggle(topic.id, completed)}
            />
          ))}
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: Topic;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: (completed: boolean) => void;
}

function TopicCard({ topic, isExpanded, onToggle, onComplete }: TopicCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Topic Header */}
      <div 
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(!topic.completed);
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              {topic.completed ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </button>
            <div>
              <h3 className={`font-semibold ${topic.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {topic.title}
              </h3>
              <p className="text-sm text-gray-600">{topic.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {topic.videos.length} vídeos
            </span>
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ↓
            </div>
          </div>
        </div>
      </div>

      {/* Videos List */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {topic.videos.length > 0 ? (
            topic.videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhum vídeo encontrado para este tópico.</p>
          )}
        </div>
      )}
    </div>
  );
}

interface VideoCardProps {
  video: YouTubeVideo;
}

function VideoCard({ video }: VideoCardProps) {
  const openVideo = () => {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank');
  };

  return (
    <div 
      className="flex space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={openVideo}
    >
      {/* Thumbnail */}
      <div className="relative w-32 h-20 flex-shrink-0">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="rounded object-cover"
          sizes="128px"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Video Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 line-clamp-2 mb-1">
          {video.title}
        </h4>
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
          <div className="flex items-center space-x-1">
            <User className="w-4 h-4" />
            <span>{video.channelTitle}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{video.duration}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">
          {video.description}
        </p>
      </div>
    </div>
  );
}