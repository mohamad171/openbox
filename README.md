# Leitner Box

A beautiful spaced repetition flashcard app built with Vue.js and Supabase.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from Settings > API
4. Create a `.env` file:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run the app

```bash
npm run dev
```

## How Leitner Box Works

The Leitner system uses 5 boxes with increasing review intervals:

- **Box 1**: Review daily (new cards start here)
- **Box 2**: Review every 2 days
- **Box 3**: Review every 4 days
- **Box 4**: Review weekly
- **Box 5**: Review bi-weekly (mastered cards)

When you answer correctly, the card moves to the next box. When you answer incorrectly, the card returns to Box 1.


<!-- Security scan triggered at 2026-09-05 07:34:09 -->

<!-- Security scan triggered at 2026-10-07 11:51:27 -->