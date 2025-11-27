import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const itag = searchParams.get('itag');

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!itag) {
    return NextResponse.json({ error: 'Missing itag' }, { status: 400 });
  }

  try {
    const agent = ytdl.createAgent(JSON.parse(process.env.YOUTUBE_COOKIES || '[]'));
    const info = await ytdl.getInfo(url, { agent });
    const format = info.formats.find((f) => f.itag === Number(itag));

    if (!format) {
      return NextResponse.json({ error: 'Format not found' }, { status: 404 });
    }

    const videoTitle = info.videoDetails.title.replace(/[^\w\s\u3131-\uD79D]/gi, '').substring(0, 50); // Keep Korean chars
    const extension = format.container || 'mp4';
    const filename = `${videoTitle}.${extension}`;

    const headers = new Headers();
    // Use encodeURIComponent to handle non-ASCII characters in filename safely
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Content-Type', 'application/octet-stream');

    // Create a stream from ytdl and pass it to the response
    const stream = ytdl(url, {
        quality: Number(itag),
        agent
    });

    // @ts-ignore: Next.js supports passing a readable stream as the body
    return new NextResponse(stream, {
        headers,
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({
        error: 'Failed to download video',
        details: error.message || String(error)
    }, { status: 500 });
  }
}
