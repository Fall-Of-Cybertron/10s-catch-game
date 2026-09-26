ALTER TABLE scores ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS user_agent text;

CREATE TABLE IF NOT EXISTS banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);
