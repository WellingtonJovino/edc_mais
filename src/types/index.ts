export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topics: Topic[];
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  order: number;
  videos: YouTubeVideo[];
  completed: boolean;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  videoId: string;
  relevanceScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LearningPlan {
  id: string;
  goal: LearningGoal;
  messages: ChatMessage[];
  progress: number;
  created_at: string;
}