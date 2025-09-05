import { YouTubeVideo } from '@/types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount';
  duration?: 'short' | 'medium' | 'long';
  language?: string;
}

export async function searchYouTubeVideos(params: YouTubeSearchParams): Promise<YouTubeVideo[]> {
  const {
    query,
    maxResults = 10,
    order = 'relevance',
    duration,
    language = 'pt'
  } = params;

  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults.toString(),
    order,
    relevanceLanguage: language,
    key: process.env.YOUTUBE_API_KEY!,
  });

  if (duration) {
    searchParams.append('videoDuration', duration);
  }

  try {
    const searchResponse = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
    
    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    const detailsParams = new URLSearchParams({
      part: 'contentDetails,statistics',
      id: videoIds,
      key: process.env.YOUTUBE_API_KEY!,
    });

    const detailsResponse = await fetch(`${YOUTUBE_API_BASE}/videos?${detailsParams}`);
    const detailsData = await detailsResponse.json();

    return searchData.items.map((item: any, index: number) => {
      const details = detailsData.items[index];
      
      return {
        id: `${item.id.videoId}-${Date.now()}`,
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: formatDuration(details?.contentDetails?.duration || 'PT0M'),
      } as YouTubeVideo;
    });
  } catch (error) {
    console.error('Erro ao buscar vídeos do YouTube:', error);
    throw new Error('Falha ao buscar vídeos. Tente novamente.');
  }
}

export async function searchVideosByTopics(topics: Array<{ title: string; keywords: string[] }>): Promise<{ [topicTitle: string]: YouTubeVideo[] }> {
  const results: { [topicTitle: string]: YouTubeVideo[] } = {};

  for (const topic of topics) {
    const queries = [
      topic.title,
      ...topic.keywords.map(keyword => `${topic.title} ${keyword}`),
    ];

    const allVideos: YouTubeVideo[] = [];

    for (const query of queries.slice(0, 2)) {
      try {
        const videos = await searchYouTubeVideos({
          query,
          maxResults: 3,
          order: 'relevance',
        });
        allVideos.push(...videos);
      } catch (error) {
        console.error(`Erro ao buscar vídeos para "${query}":`, error);
      }
    }

    const uniqueVideos = allVideos.filter((video, index, self) =>
      index === self.findIndex(v => v.videoId === video.videoId)
    );

    results[topic.title] = uniqueVideos.slice(0, 5);
  }

  return results;
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}