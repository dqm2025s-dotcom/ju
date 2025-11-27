import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Basic validation without relying solely on ytdl.validateURL which can sometimes be false negative
  // or if the library is lagging behind API changes.
  if (!ytdl.validateURL(url)) {
     return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    // Add agent to avoid 403 errors (common issue with Vercel/serverless)
    const agent = ytdl.createAgent(JSON.parse(process.env.YOUTUBE_COOKIES || '[]'));

    // Pass agent options if needed, though usually standard call is enough with @distube/ytdl-core
    const info = await ytdl.getInfo(url, { agent });

    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    const result = {
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url, // Highest quality thumbnail
      duration: info.videoDetails.lengthSeconds,
      formats: formats.map((format) => ({
        itag: format.itag,
        qualityLabel: format.qualityLabel,
        container: format.container,
        hasAudio: format.hasAudio,
        hasVideo: format.hasVideo,
      })),
      audioFormats: audioFormats.map((format) => ({
        itag: format.itag,
        container: format.container,
        audioBitrate: format.audioBitrate,
      })),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching video info:', error);
    // Return the actual error message for debugging purposes
    return NextResponse.json({
        error: 'Failed to fetch video info',
        details: error.message || String(error)
    }, { status: 500 });
  }
}
