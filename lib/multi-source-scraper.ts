// Multi-Source Scraper: YouTube, Instagram, Voice Notes
// Enriches website data with additional context sources

export interface YouTubeData {
  transcript: string;
  videoTitle: string;
  videoId: string;
  language: string;
}

export interface InstagramData {
  posts: Array<{
    caption: string;
    timestamp: string;
  }>;
  bio: string;
  profileName: string;
}

export interface VoiceNoteData {
  transcript: string;
  duration: number;
}

export interface EnrichedContextData {
  videoDemo?: YouTubeData;
  socialVisuals?: InstagramData;
  customBrief?: VoiceNoteData;
}

/**
 * Extract YouTube video transcript using Dumpling AI
 */
export async function extractYouTubeTranscript(videoUrl: string): Promise<YouTubeData | null> {
  const apiKey = process.env.DUMPLING_API;

  if (!apiKey) {
    console.warn('[multi-source] DUMPLING_API key not found, skipping YouTube extraction');
    return null;
  }

  try {
    console.log('[multi-source] Extracting YouTube transcript:', videoUrl);

    const response = await fetch('https://app.dumplingai.com/api/v1/get-youtube-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        videoUrl,
        includeTimestamps: false, // Get clean transcript without timestamps
        preferredLanguage: 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[multi-source] YouTube API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();

    console.log('[multi-source] ✓ YouTube transcript extracted:', data.transcript?.substring(0, 100) + '...');

    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : '';

    return {
      transcript: data.transcript || '',
      videoTitle: data.title || 'Product Demo',
      videoId,
      language: data.language || 'en',
    };
  } catch (error) {
    console.error('[multi-source] YouTube extraction failed:', error);
    return null;
  }
}

/**
 * Extract Instagram profile data using Dumpling AI (via TikTok profile API as proxy)
 * Note: Instagram scraping is limited, this is a placeholder
 */
export async function extractInstagramProfile(instagramUrl: string): Promise<InstagramData | null> {
  // Instagram scraping is complex and may require different approaches
  // For now, we'll log this and return null
  // Future enhancement: Implement proper Instagram scraping

  console.log('[multi-source] Instagram scraping not yet implemented:', instagramUrl);
  console.log('[multi-source] Returning null - will use website data only for now');

  return null;

  // TODO: Implement Instagram scraping
  // Options:
  // 1. Use Dumpling's screenshot + extract-image APIs
  // 2. Use third-party Instagram API
  // 3. Build custom scraper
}

/**
 * Transcribe voice note using Dumpling AI
 */
export async function transcribeVoiceNote(audioUrl: string): Promise<VoiceNoteData | null> {
  const apiKey = process.env.DUMPLING_API;

  if (!apiKey) {
    console.warn('[multi-source] DUMPLING_API key not found, skipping voice transcription');
    return null;
  }

  try {
    console.log('[multi-source] Transcribing voice note:', audioUrl);

    const response = await fetch('https://app.dumplingai.com/api/v1/extract-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputMethod: 'url',
        audio: audioUrl,
        prompt: 'Transcribe this audio verbatim. Include all details about product requirements, target audience, tone preferences, and any specific instructions for the video.',
        jsonMode: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[multi-source] Voice API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();

    console.log('[multi-source] ✓ Voice note transcribed:', data.text?.substring(0, 100) + '...');

    return {
      transcript: data.text || '',
      duration: 0, // Dumpling doesn't return duration
    };
  } catch (error) {
    console.error('[multi-source] Voice transcription failed:', error);
    return null;
  }
}

/**
 * Main function: Scrape all additional sources
 */
export async function scrapeAdditionalSources({
  youtubeUrl,
  instagramUrl,
  voiceNoteUrl,
}: {
  youtubeUrl?: string;
  instagramUrl?: string;
  voiceNoteUrl?: string;
}): Promise<EnrichedContextData> {
  console.log('[multi-source] Starting multi-source scraping...');
  console.log('[multi-source] YouTube:', youtubeUrl || 'none');
  console.log('[multi-source] Instagram:', instagramUrl || 'none');
  console.log('[multi-source] Voice Note:', voiceNoteUrl || 'none');

  // Scrape all sources in parallel
  const [videoDemo, socialVisuals, customBrief] = await Promise.all([
    youtubeUrl ? extractYouTubeTranscript(youtubeUrl) : Promise.resolve(null),
    instagramUrl ? extractInstagramProfile(instagramUrl) : Promise.resolve(null),
    voiceNoteUrl ? transcribeVoiceNote(voiceNoteUrl) : Promise.resolve(null),
  ]);

  const enrichedData: EnrichedContextData = {};

  if (videoDemo) {
    enrichedData.videoDemo = videoDemo;
    console.log('[multi-source] ✓ YouTube data added');
  }

  if (socialVisuals) {
    enrichedData.socialVisuals = socialVisuals;
    console.log('[multi-source] ✓ Instagram data added');
  }

  if (customBrief) {
    enrichedData.customBrief = customBrief;
    console.log('[multi-source] ✓ Voice note data added');
  }

  const sourcesCount = Object.keys(enrichedData).length;
  console.log(`[multi-source] ✅ Enriched with ${sourcesCount} additional source(s)`);

  return enrichedData;
}

/**
 * Helper: Check if URL is valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/.test(url);
}

/**
 * Helper: Check if URL is valid Instagram URL
 */
export function isValidInstagramUrl(url: string): boolean {
  if (!url) return false;
  return /(?:instagram\.com\/|@)([a-zA-Z0-9._]+)/.test(url);
}
