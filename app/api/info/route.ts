import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
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
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
  }
}
