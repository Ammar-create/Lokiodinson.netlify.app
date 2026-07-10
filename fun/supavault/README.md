# SupaVault

A dark, premium notes application powered by Supabase. Create an account, write notes, and access them from anywhere.

**Live**: [ammar-create.github.io/Lokiodinson.netlify.app/fun/supavault/](https://ammar-create.github.io/Lokiodinson.netlify.app/fun/supavault/)

## Features

- Email/password authentication via Supabase Auth
- CRUD notes with real-time sync
- Client-side search
- Row Level Security (users only see their own data)
- Toast notifications for all actions
- Responsive down to mobile
- Accessible (keyboard nav, focus states, reduced motion)

## Architecture

```
supavault/
├── index.html   Structure
├── style.css    Inkwell design system
├── app.js       Application logic (IIFE, no globals)
└── README.md    This file
```

## Supabase Setup

The app ships with pre-configured credentials for the default project. To use your own:

1. Create a project at [supabase.com](https://supabase.com)
2. Run this SQL in the SQL Editor:

```sql
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_created_at_idx ON notes(created_at DESC);
```

3. Enable replication for `notes` in Database > Replication
4. Enter your project URL and anon key in the app's configuration panel

## Design

Inkwell design system: deep charcoal background, warm amber accent, Playfair Display headings, DM Sans body text. Vault glyph animation on the auth screen.
