'use client';

import { useState } from 'react';
import { Play, X, ExternalLink } from 'lucide-react';

interface VideoPlayerProps {
  video: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    url: string;
    duration: string;
    channelTitle: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Extrair o video ID do YouTube URL
  const getVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };
  
  const videoId = getVideoId(video.url);

  if (!videoId) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-gray-600">Erro ao carregar vídeo</p>
        <a 
          href={video.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 inline-flex items-center mt-2"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Abrir no YouTube
        </a>
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-gray-900 group cursor-pointer" onClick={() => setIsPlaying(true)}>
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-30 transition-all">
          <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <h4 className="text-white font-medium text-sm line-clamp-2">{video.title}</h4>
          <p className="text-gray-300 text-xs mt-1">{video.channelTitle}</p>
          {video.duration && (
            <span className="absolute top-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
              {video.duration}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-900">
      <div className="relative w-full h-64">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={video.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <button
          onClick={() => setIsPlaying(false)}
          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 bg-gray-800">
        <h4 className="text-white font-medium text-sm line-clamp-2">{video.title}</h4>
        <p className="text-gray-400 text-xs mt-1">{video.channelTitle}</p>
        <a 
          href={video.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 inline-flex items-center mt-2 text-xs"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Abrir no YouTube
        </a>
      </div>
    </div>
  );
}