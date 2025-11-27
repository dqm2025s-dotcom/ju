import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const itag = searchParams.get('itag');
  const type = searchParams.get('type'); // 'video' or 'audio' for filename suggestion

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!itag) {
    return NextResponse.json({ error: 'Missing itag' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = info.formats.find((f) => f.itag === Number(itag));

    if (!format) {
      return NextResponse.json({ error: 'Format not found' }, { status: 404 });
    }

    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    const extension = format.container || 'mp4';
    const filename = `${videoTitle}.${extension}`;

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', 'application/octet-stream');

    // Create a stream from ytdl and pass it to the response
    const stream = ytdl(url, { quality: Number(itag) });

    // @ts-ignore: Next.js supports passing a readable stream as the body
    return new NextResponse(stream, {
        headers,
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
  }
}
