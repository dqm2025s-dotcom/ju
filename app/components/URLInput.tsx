'use client';

import { useState, useCallback, useEffect } from 'react';

// Simple debounce implementation
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface URLInputProps {
  onValidUrl: (url: string) => void;
  onClear: () => void;
}

export default function URLInput({ onValidUrl, onClear }: URLInputProps) {
  const [input, setInput] = useState('');
  const debouncedInput = useDebounce(input, 500);

  useEffect(() => {
    if (!debouncedInput) {
        onClear();
        return;
    }

    // Simple YouTube URL regex
    const youtubeRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
    if (youtubeRegex.test(debouncedInput)) {
      onValidUrl(debouncedInput);
    } else {
        // Optionally handle invalid URL feedback
    }
  }, [debouncedInput, onValidUrl, onClear]);

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
        YouTube URL
      </label>
      <input
        id="youtube-url"
        type="text"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black"
        placeholder="https://www.youtube.com/watch?v=..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
    </div>
  );
}
