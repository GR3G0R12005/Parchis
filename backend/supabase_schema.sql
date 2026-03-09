-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  coins INTEGER NOT NULL DEFAULT 1000,
  gems INTEGER NOT NULL DEFAULT 0,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create room_players table
CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  position_index INTEGER DEFAULT 0,
  is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

-- Create game_history table
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  placement INTEGER NOT NULL,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_game_rooms_creator_id ON game_rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_player_id ON room_players(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_player_id ON game_history(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_room_id ON game_history(room_id);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for game_rooms table
CREATE POLICY "Anyone can read game rooms" ON game_rooms FOR SELECT USING (TRUE);
CREATE POLICY "Users can create game rooms" ON game_rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their game rooms" ON game_rooms FOR UPDATE USING (auth.uid() = creator_id);

-- RLS Policies for room_players table
CREATE POLICY "Anyone can read room players" ON room_players FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert themselves into rooms" ON room_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Users can update their own room player record" ON room_players FOR UPDATE USING (auth.uid() = player_id);

-- RLS Policies for game_history table
CREATE POLICY "Anyone can read game history" ON game_history FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert their own game history" ON game_history FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create store_packages table
CREATE TABLE IF NOT EXISTS store_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('coins', 'gems')),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create board_themes table
CREATE TABLE IF NOT EXISTS board_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create token_styles table
CREATE TABLE IF NOT EXISTS token_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for admin tables
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_store_packages_type ON store_packages(type);
CREATE INDEX IF NOT EXISTS idx_store_packages_active ON store_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_board_themes_active ON board_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_token_styles_active ON token_styles(is_active);

-- Enable RLS for new tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users table
CREATE POLICY "Admins can read admin users" ON admin_users FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users)
);

-- RLS Policies for store_packages table (anyone can read, only admins can modify)
CREATE POLICY "Anyone can read store packages" ON store_packages FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can insert store packages" ON store_packages FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can update store packages" ON store_packages FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can delete store packages" ON store_packages FOR DELETE USING (
  auth.uid() IN (SELECT id FROM admin_users)
);

-- RLS Policies for board_themes table (anyone can read, only admins can modify)
CREATE POLICY "Anyone can read board themes" ON board_themes FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can insert board themes" ON board_themes FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can update board themes" ON board_themes FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can delete board themes" ON board_themes FOR DELETE USING (
  auth.uid() IN (SELECT id FROM admin_users)
);

-- RLS Policies for token_styles table (anyone can read, only admins can modify)
CREATE POLICY "Anyone can read token styles" ON token_styles FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can insert token styles" ON token_styles FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can update token styles" ON token_styles FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can delete token styles" ON token_styles FOR DELETE USING (
  auth.uid() IN (SELECT id FROM admin_users)
);

-- Add price_gems column to board_themes and token_styles
ALTER TABLE board_themes ADD COLUMN IF NOT EXISTS price_gems INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_styles ADD COLUMN IF NOT EXISTS price_gems INTEGER NOT NULL DEFAULT 0;

-- Create user_purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('board', 'token')),
  item_id UUID NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);

-- Enable RLS for user_purchases
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_purchases table
CREATE POLICY "Users can read their own purchases" ON user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchases" ON user_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No default data - admin creates all packages, boards and tokens from the admin panel
