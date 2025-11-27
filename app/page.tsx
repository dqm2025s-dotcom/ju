'use client';

import { useState } from 'react';
import URLInput from './components/URLInput';
import confetti from 'canvas-confetti';

interface VideoFormat {
  itag: number;
  qualityLabel: string;
  container: string;
  hasAudio: boolean;
  hasVideo: boolean;
  audioBitrate?: number;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  formats: VideoFormat[];
  audioFormats: VideoFormat[];
}

export default function Home() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingItag, setDownloadingItag] = useState<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  const fetchVideoInfo = async (url: string) => {
    setLoading(true);
    setError(null);
    setVideoInfo(null);
    setCurrentUrl(url);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch video info');
      }
      const data = await res.json();
      setVideoInfo(data);
    } catch (err) {
      setError('영상 정보를 가져오는데 실패했습니다. URL을 확인해주세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
      setVideoInfo(null);
      setError(null);
      setCurrentUrl('');
  };

  const handleDownload = async (itag: number, type: 'video' | 'audio', extension: string, title: string) => {
    setDownloadingItag(itag);

    try {
      const response = await fetch(`/api/download?url=${encodeURIComponent(currentUrl)}&itag=${itag}&type=${type}`);

      if (!response.ok) throw new Error('Download failed');

      // Note: Loading the entire file as a Blob can be memory intensive on mobile devices for large videos.
      // This approach is used to strictly detect "finish" for the confetti requirement.
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeTitle = title.replace(/[^\w\s]/gi, '').trim() || 'video';
      a.download = `${safeTitle}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      // Trigger Confetti on success
      try {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
        });
      } catch (confettiError) {
        console.warn('Confetti animation failed (likely due to restricted environment):', confettiError);
      }

    } catch (err) {
      console.error('Download error:', err);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingItag(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">YouTube Downloader</h1>

      <URLInput onValidUrl={fetchVideoInfo} onClear={handleClear} />

      {loading && (
        <div className="mt-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {videoInfo && (
        <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-md">
          <img
            src={videoInfo.thumbnail}
            alt={videoInfo.title}
            className="w-full h-48 object-cover"
          />
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 line-clamp-2">{videoInfo.title}</h2>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Video</h3>
              <div className="space-y-2">
                {videoInfo.formats.map((format) => (
                  <button
                    key={format.itag}
                    onClick={() => handleDownload(format.itag, 'video', format.container, videoInfo.title)}
                    disabled={downloadingItag !== null}
                    className="w-full flex justify-between items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black"
                  >
                    <span className="font-medium">{format.qualityLabel}</span>
                    <span className="text-sm text-gray-500">{format.container}</span>
                    {downloadingItag === format.itag && <span className="text-sm text-blue-600 animate-pulse">Downloading...</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Audio Only</h3>
              <div className="space-y-2">
                {videoInfo.audioFormats.map((format) => (
                   <button
                   key={format.itag}
                   onClick={() => handleDownload(format.itag, 'audio', format.container, videoInfo.title)}
                   disabled={downloadingItag !== null}
                   className="w-full flex justify-between items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black"
                 >
                   <span className="font-medium">Audio ({format.audioBitrate}kbps)</span>
                   <span className="text-sm text-gray-500">{format.container}</span>
                   {downloadingItag === format.itag && <span className="text-sm text-green-600 animate-pulse">Downloading...</span>}
                 </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
