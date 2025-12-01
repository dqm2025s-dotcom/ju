#!/bin/bash

# setup_cm.sh
# This script sets up the 'AI Content Generator' project in a new Next.js repository.
# Usage: Run this script from the root of your NEW 'cm' Next.js project.

echo "🚀 Starting setup for AI Content Generator Project (cm)..."

# 1. Install Dependencies
echo "📦 Installing dependencies (openai, prisma)..."
npm install openai prisma@5 @prisma/client@5
npm install -D typescript @types/node @types/react

# 2. Initialize Prisma
echo "🗄️ Initializing Prisma..."
mkdir -p prisma

# Write schema.prisma
cat > prisma/schema.prisma << 'EOF'
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

// Development / Testing: SQLite
// Production: PostgreSQL (Vercel Postgres)
// To switch to Postgres:
// 1. Change provider to "postgresql"
// 2. Update DATABASE_URL in .env to your Postgres connection string
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Post {
  id          String   @id @default(uuid())
  topic       String
  title       String
  description String
  sideA       String
  sideB       String
  voteCountA  Int      @default(0)
  voteCountB  Int      @default(0)
  comments    String   // Using String for SQLite compatibility. Will parse JSON in application logic.
  createdAt   DateTime @default(now())
}
EOF

# 3. Create Lib Directory and DB Client
echo "🛠️ Creating lib/db.ts..."
mkdir -p lib
cat > lib/db.ts << 'EOF'
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
EOF

# 4. Create Server Actions
echo "⚡ Creating Server Actions..."
mkdir -p app/actions

# Write app/actions/generator.ts
cat > app/actions/generator.ts << 'EOF'
'use server';

import OpenAI from 'openai';

// Define the interface for the generated content
export interface Comment {
  author: string;
  content: string;
}

export interface GeneratedPost {
  topic: string;
  title: string;
  description: string;
  sideA: string;
  sideB: string;
  voteCountA: number;
  voteCountB: number;
  comments: Comment[];
}

export async function generatePostContent(topic: string): Promise<GeneratedPost> {
  // If no API key is present, or if we are in a test environment without one, return mock data.
  // This allows the UI to be tested without consuming tokens or needing a key.
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OPENAI_API_KEY is missing. Returning mock data.');
    return getMockData(topic);
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    const prompt = `
    Topic: ${topic}

    You are a content generator for a Korean community voting site (like DC Inside, FM Korea, Blind).
    Create a "VS" style debate post based on the topic.

    Tone & Manner:
    - Informal Korean (Banmal), slang allowed (e.g., ~냐?, ~다, 음슴체).
    - Humorous, slightly aggressive but fun debate style.
    - Avoid formal language ("해요/합니다" is strictly forbidden).
    - Use "Fact" or "Logic" (even if forced) to support both sides.

    Requirements:
    1. Title: Catchy, clickbait-style.
    2. Description: Brief intro/summary of the situation.
    3. Side A: Argument for the first option.
    4. Side B: Argument for the second option.
    5. Vote Counts: Random integers between 10 and 50 for each side.
    6. Comments: 5-7 fake comments.
       - Each comment should have a nickname (author) and content.
       - Comments should look like real community reactions (some fighting, some joking).

    Return the result strictly as a valid JSON object with the following keys:
    {
      "title": "string",
      "description": "string",
      "sideA": "string",
      "sideB": "string",
      "voteCountA": number,
      "voteCountB": number,
      "comments": [
        { "author": "string", "content": "string" }
      ]
    }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates JSON data." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const parsed = JSON.parse(content);

    return {
      topic,
      title: parsed.title,
      description: parsed.description,
      sideA: parsed.sideA,
      sideB: parsed.sideB,
      voteCountA: parsed.voteCountA || Math.floor(Math.random() * 40) + 10,
      voteCountB: parsed.voteCountB || Math.floor(Math.random() * 40) + 10,
      comments: parsed.comments || [],
    };

  } catch (error) {
    console.error("Error generating content:", error);
    // Fallback to mock data if API fails
    return getMockData(topic);
  }
}

function getMockData(topic: string): GeneratedPost {
  return {
    topic,
    title: `[목업] ${topic} vs 반대 상황 (API 키 없음)`,
    description: "이것은 OpenAI API 키가 없어서 생성된 목업 데이터임. 실제로는 API가 호출되어야 함.",
    sideA: "이쪽이 무조건 맞음. 반박시 니말이 틀림.",
    sideB: "웃기고 있네 ㅋㅋ 현실을 살아라.",
    voteCountA: 15,
    voteCountB: 32,
    comments: [
      { author: "ㅇㅇ", content: "이걸 고민하냐? 닥전이지" },
      { author: "유동", content: "솔직히 밸붕 아님? ㅋㅋㅋ" },
      { author: "팩트폭격기", content: "알못들이 또 설치네" },
    ],
  };
}
EOF

# Write app/actions/save-post.ts
cat > app/actions/save-post.ts << 'EOF'
'use server';

import prisma from '@/lib/db';
import { GeneratedPost } from './generator';

export async function savePost(data: GeneratedPost) {
  try {
    // Validate basics
    if (!data.topic || !data.title || !data.sideA || !data.sideB) {
      return { success: false, message: 'Missing required fields' };
    }

    // Save to DB
    const post = await prisma.post.create({
      data: {
        topic: data.topic,
        title: data.title,
        description: data.description,
        sideA: data.sideA,
        sideB: data.sideB,
        voteCountA: data.voteCountA,
        voteCountB: data.voteCountB,
        // Stringify comments for SQLite compatibility as per schema decision
        comments: JSON.stringify(data.comments),
      },
    });

    return { success: true, postId: post.id };
  } catch (error) {
    console.error('Failed to save post:', error);
    return { success: false, message: 'Database error' };
  }
}
EOF

# 5. Create Admin Page UI
echo "🖥️ Creating Admin UI at app/admin/generator/page.tsx..."
mkdir -p app/admin/generator

cat > app/admin/generator/page.tsx << 'EOF'
'use server';
// Note: This file is a Server Component that imports a Client Component (if separated) or is 'use client' itself.
// Since the provided code was 'use client', we will write it as such.
EOF

# Overwrite with the full 'use client' content
cat > app/admin/generator/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { generatePostContent, GeneratedPost, Comment } from '@/app/actions/generator';
import { savePost } from '@/app/actions/save-post';

export default function GeneratorPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GeneratedPost | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSaveStatus('idle');
    try {
      const result = await generatePostContent(topic);
      setData(result);
    } catch (e) {
      console.error(e);
      alert('생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!data) return;
    setSaveStatus('saving');
    try {
      const result = await savePost(data);
      if (result.success) {
        setSaveStatus('success');
        alert('저장되었습니다!');
        // Optional: Reset or redirect
      } else {
        setSaveStatus('error');
        alert(`저장 실패: ${result.message}`);
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const updateField = (field: keyof GeneratedPost, value: string | number | Comment[]) => {
    if (!data) return;
    // We use a type assertion here because we know the value matches the field type based on usage,
    // but TypeScript needs help because GeneratePost[keyof GeneratedPost] is a union.
    setData({ ...data, [field]: value } as GeneratedPost);
  };

  const updateComment = (index: number, field: keyof Comment, value: string) => {
    if (!data) return;
    const newComments = [...data.comments];
    newComments[index] = { ...newComments[index], [field]: value };
    updateField('comments', newComments);
  };

  const deleteComment = (index: number) => {
    if (!data) return;
    const newComments = data.comments.filter((_, i) => i !== index);
    updateField('comments', newComments);
  };

  const addComment = () => {
    if (!data) return;
    const newComments = [...data.comments, { author: '익명', content: '' }];
    updateField('comments', newComments);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">AI 콘텐츠 생성기 (Admin)</h1>

        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">주제 입력</label>
          <div className="flex gap-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 민트초코 호 vs 불호"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '생성 중...' : '생성하기'}
            </button>
          </div>
        </div>

        {/* Editor Section */}
        {data && (
          <div className="bg-white p-8 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6">

              {/* Meta Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full">
                  <label className="block text-sm font-bold text-gray-700 mb-2">제목</label>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-bold text-gray-700 mb-2">설명 (요약)</label>
                  <textarea
                    value={data.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* A vs B Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                {/* Side A */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-600 text-lg">SIDE A</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">초기 득표수</span>
                      <input
                        type="number"
                        value={data.voteCountA}
                        onChange={(e) => updateField('voteCountA', parseInt(e.target.value) || 0)}
                        className="w-20 p-1 text-center border rounded"
                      />
                    </div>
                  </div>
                  <textarea
                    value={data.sideA}
                    onChange={(e) => updateField('sideA', e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Side B */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-red-600 text-lg">SIDE B</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">초기 득표수</span>
                      <input
                        type="number"
                        value={data.voteCountB}
                        onChange={(e) => updateField('voteCountB', parseInt(e.target.value) || 0)}
                        className="w-20 p-1 text-center border rounded"
                      />
                    </div>
                  </div>
                  <textarea
                    value={data.sideB}
                    onChange={(e) => updateField('sideB', e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              {/* Comments Section */}
              <div className="mt-4">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-lg font-bold text-gray-800">가상 댓글 관리 ({data.comments.length})</h3>
                  <button
                    onClick={addComment}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
                  >
                    + 댓글 추가
                  </button>
                </div>

                <div className="space-y-3">
                  {data.comments.map((comment, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                      <div className="w-1/4">
                        <input
                          type="text"
                          value={comment.author}
                          onChange={(e) => updateComment(idx, 'author', e.target.value)}
                          placeholder="작성자"
                          className="w-full p-2 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none font-bold text-gray-700"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={comment.content}
                          onChange={(e) => updateComment(idx, 'content', e.target.value)}
                          placeholder="댓글 내용"
                          className="w-full p-2 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => deleteComment(idx)}
                        className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={handlePublish}
                  disabled={saveStatus === 'saving'}
                  className={`
                    px-8 py-3 rounded-lg font-bold text-lg shadow-md transition-all
                    ${saveStatus === 'saving' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg transform hover:-translate-y-0.5'}
                  `}
                >
                  {saveStatus === 'saving' ? '저장 중...' : 'DB에 저장 (Publish)'}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# 6. Final Instructions
echo "✅ Setup complete!"
echo "⚠️  Important Next Steps:"
echo "1. Create a .env or .env.local file in the root of your 'cm' project."
echo "2. Add the following lines to it:"
echo "   DATABASE_URL=\"file:./dev.db\""
echo "   OPENAI_API_KEY=\"sk-your-openai-api-key\""
echo "3. Run migration to create the database:"
echo "   npx prisma migrate dev --name init"
echo "4. Start the server:"
echo "   npm run dev"
echo "5. Visit http://localhost:3000/admin/generator"

EOF
