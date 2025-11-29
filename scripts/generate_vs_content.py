import os
import json
import random
import uuid
from typing import List, Dict, Any

# ==========================================
# Configuration & Setup
# ==========================================

# Initialize OpenAI Client
# Assumes OPENAI_API_KEY is set in environment variables
try:
    from openai import OpenAI, OpenAIError

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Warning: OPENAI_API_KEY environment variable is not set. Content generation will be skipped.")
        client = None
    else:
        client = OpenAI(api_key=api_key)

except ImportError:
    print("Error: 'openai' library not found. Please install it using 'pip install -r scripts/requirements.txt'")
    client = None

MODEL_NAME = "gpt-4o-mini"
INPUT_FILE = "scripts/topics.json"
OUTPUT_FILE = "scripts/vs_content_data.json"

# ==========================================
# Step 1: Topic Input & Search Placeholder
# ==========================================

def fetch_search_results(topic: str) -> str:
    """
    Placeholder for Google Search / SerpApi integration.
    Currently returns the topic itself as mock context.

    TODO: Integrate SerpApi or Google Custom Search API here.
    Example:
    results = serpapi_search(topic)
    return extract_text_from_results(results)
    """
    # In a real scenario, this would return crawled text summaries.
    # For now, we rely on LLM's internal knowledge, so we return an empty string
    # or just the topic to emphasize what to focus on.
    return f"Topic: {topic} (Use internal knowledge)"

# ==========================================
# Step 2 & 3: Content & Comment Generation
# ==========================================

def generate_content_with_llm(client: OpenAI, topic: str, context: str) -> Dict[str, Any]:
    """
    Generates VS content and comments using OpenAI API.
    """
    if not client:
        raise RuntimeError("OpenAI client is not initialized.")

    system_prompt = """
너는 한국의 인터넷 커뮤니티(디시인사이드, 펨코 등)의 헤비 유저이자 전문 에디터야.
인터넷에서 유행하는 논쟁 주제를 분석해서, 사람들이 댓글을 달고 싶어 미치게 만드는 "VS 게시글"을 작성해야 해.
말투는 너무 딱딱하지 않게, 인터넷 은어(ㅋㅋ, ㄹㅇ, 킹정 등)를 적절히 섞어서 자연스럽게 작성해.

[작업 목표]
1. Task 1 (본문): 양쪽의 입장을 아주 공평하지만 자극적으로 요약해.
2. Task 2 (댓글): 실제 유저들이 싸우는 것처럼 리얼한 댓글을 3~5개 작성해.

[페르소나 가이드]
- A 지지자: A를 옹호하며 B를 비난 (다소 거친 말투)
- B 지지자: 논리적으로 B가 낫다고 설득 (차분한 말투)
- 중립/드립: 주제와 관련 없거나 웃긴 포인트 지적 (짧은 유머)
- 바이럴 의심: 광고 아니냐고 의심하는 까칠한 유저

[출력 형식]
반드시 아래의 JSON 포맷으로만 응답해. Markdown 코드 블록(```json)이나 다른 설명은 포함하지 마.

{
  "category": "Tech, Food, or Life (Choose one)",
  "title": "자극적인 제목",
  "content": {
    "intro": "짧은 도입부",
    "side_A": {
      "name": "A측 명칭 (예: 갤럭시)",
      "arguments": ["주장1", "주장2", "주장3"]
    },
    "side_B": {
      "name": "B측 명칭 (예: 아이폰)",
      "arguments": ["주장1", "주장2", "주장3"]
    },
    "closing": "투표 유도 멘트"
  },
  "comments": [
    {
      "user_id": "랜덤 유저 아이디",
      "type": "Side_A | Side_B | Neutral | Viral_Suspect",
      "text": "댓글 내용",
      "likes": 0
    }
  ]
}
"""

    user_prompt = f"""
주제: {topic}
참고 정보: {context}

위 주제로 VS 콘텐츠를 생성해 줘.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.8, # Slightly creative for community vibes
        )

        content_str = response.choices[0].message.content
        return json.loads(content_str)

    except Exception as e:
        print(f"Error generating content for topic '{topic}': {e}")
        return None

# ==========================================
# Step 4: Data Structure & Main Loop
# ==========================================

def main():
    # 1. Load Topics
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        topics = json.load(f)

    print(f"Loaded {len(topics)} topics from {INPUT_FILE}")

    results = []

    # 2. Process each topic
    for i, topic in enumerate(topics):
        print(f"Processing ({i+1}/{len(topics)}): {topic}...")

        # Step 1: Search (Placeholder)
        search_context = fetch_search_results(topic)

        # Step 2 & 3: Generate Content
        if not client:
            print("Skipping LLM generation (No API Client).")
            continue

        generated_data = generate_content_with_llm(client, topic, search_context)

        if generated_data:
            # Step 4: Post-processing & Structuring
            # Add fields that are better generated procedurally or weren't strict in LLM output

            # Generate a consistent ID (using index or hash could work, uuid is safer)
            # User example: "vs_001"
            topic_id = f"vs_{str(i+1).zfill(3)}"

            # Randomize likes for comments (if LLM returned 0 or generic numbers)
            for comment in generated_data.get("comments", []):
                if comment.get("likes") == 0:
                    comment["likes"] = random.randint(0, 50)

            # Generate random vote counts for the closing state
            vote_side_a = random.randint(50, 500)
            vote_side_b = random.randint(50, 500)

            final_structure = {
                "topic_id": topic_id,
                "category": generated_data.get("category", "General"),
                "title": generated_data.get("title", topic),
                "content": generated_data.get("content", {}),
                "comments": generated_data.get("comments", []),
                "vote_count": {
                    "side_A": vote_side_a,
                    "side_B": vote_side_b
                }
            }

            results.append(final_structure)
        else:
            print(f"Failed to generate data for {topic}")

    # 3. Save Output
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Successfully saved {len(results)} items to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
