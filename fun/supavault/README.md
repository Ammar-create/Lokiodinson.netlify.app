# SupaVault

A modern, secure notes and tasks management application powered by Supabase.

## Features

- **Authentication**: Complete sign up/sign in system using Supabase Auth
- **Notes Management**: Create, read, update, and delete notes
- **Real-time Updates**: Notes sync in real-time across all devices
- **Secure Storage**: All data stored securely in Supabase PostgreSQL
- **Modern UI**: Clean, accessible interface following Soft UI Evolution design
- **Responsive**: Works seamlessly on desktop and mobile devices

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to finish setting up

### 2. Create the Notes Table

Go to the SQL Editor in your Supabase dashboard and run:

```sql
-- Create notes table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notes
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_created_at_idx ON notes(created_at DESC);
```

### 3. Enable Realtime (Optional but Recommended)

1. Go to Database → Replication in your Supabase dashboard
2. Enable replication for the `notes` table

### 4. Get Your Credentials

1. Go to Settings → API in your Supabase dashboard
2. Copy your **Project URL** and **anon/public key**

### 5. Configure the App

1. Open SupaVault in your browser
2. Click "Supabase Configuration" to expand the settings
3. Paste your Project URL and anon key
4. Click "Save Configuration"

### 6. Start Using

1. Create an account by clicking "Sign Up"
2. Verify your email (check your inbox)
3. Sign in and start creating notes!

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Design System**: Soft UI Evolution
- **Typography**: Fira Sans + Fira Code
- **CDN**: Supabase JS Client v2

## Features in Detail

### Authentication
- Email/password sign up with email verification
- Secure sign in with session management
- Protected routes and API calls
- Automatic session persistence

### Notes Management
- Create notes with title and content
- Edit existing notes
- Delete notes with confirmation
- Automatic timestamps
- Search and filter (coming soon)

### Real-time Sync
- Instant updates when notes change
- Works across multiple devices
- No manual refresh needed

### Security
- Row Level Security (RLS) policies
- Users can only access their own data
- Secure password hashing
- Protected API endpoints

## Design Principles

- **Accessibility**: WCAG AA compliant, keyboard navigation, focus states
- **Responsive**: Mobile-first design, works on all screen sizes
- **Performance**: Optimized loading, efficient queries
- **UX**: Inline validation, loading states, error handling

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

## Privacy & Security

- Your credentials are stored securely in Supabase
- All data is encrypted in transit (HTTPS)
- Row Level Security ensures data isolation
- No third-party tracking or analytics

## Development

This is a single-file application for easy deployment. To modify:

1. Edit `index.html`
2. The app uses inline CSS and JavaScript
3. Supabase client is loaded from CDN

## Troubleshooting

**"Please configure Supabase first"**
- Make sure you've entered your Supabase URL and key
- Check that the credentials are correct

**"Failed to load notes"**
- Verify you've created the `notes` table with the SQL above
- Check that Row Level Security policies are in place

**"Sign up failed"**
- Check your email format
- Password must be at least 6 characters
- Verify your Supabase project is active

**Notes not syncing in realtime**
- Enable replication for the `notes` table in Supabase
- Check browser console for connection errors

## License

MIT License - feel free to use and modify!

## Credits

Built with ❤️ using Supabase and the UI UX Pro Max design system.
