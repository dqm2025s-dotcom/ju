# Context for AI Content Generator Project

This repository (`cm`) is a **Next.js Application** dedicated to an **AI-powered "VS" Debate Content Generator**.

## Project Architecture
- **Framework:** Next.js (App Router)
- **Database:** Prisma ORM
  - **Dev:** SQLite (`file:./dev.db`)
  - **Prod:** Vercel Postgres (PostgreSQL)
- **AI Integration:** OpenAI API (`gpt-4o-mini`)
  - Generates informal, humorous, "community-style" Korean content.
- **Styling:** Tailwind CSS

## Key Directories
- `/app/admin/generator`: The main Admin Dashboard UI.
- `/app/actions`: Server Actions for backend logic.
  - `generator.ts`: Handles OpenAI calls.
  - `save-post.ts`: Handles database saving.
- `/prisma`: Database schema and migrations.

## Current Status
- The project has been freshly scaffolded using a setup script.
- **Pending Actions for the Agent:**
  1. Ensure `.env` is configured (DATABASE_URL, OPENAI_API_KEY).
  2. Run `npx prisma migrate dev --name init` to create the local DB.
  3. Verify the `/admin/generator` page works.

## "VS" Content Model
- The `Post` model stores a debate topic, two sides (Side A/B), arguments, vote counts, and comments (stored as JSON string for compatibility).
