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
