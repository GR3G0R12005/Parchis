import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔧 Supabase Config:');
console.log('  URL:', supabaseUrl.substring(0, 30) + '...');
console.log('  Key:', supabaseKey ? '✓ Loaded' : '✗ Missing');
console.log('  Service Key:', supabaseServiceKey ? '✓ Loaded' : '✗ Missing');

// Client for user operations (anon key)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for server operations (service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  coins: number;
  gems: number;
  avatar: string;
  created_at: string;
  updated_at: string;
}

export interface GameRoom {
  id: string;
  creator_id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  winner_id?: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  color: string;
  position_index?: number;
  is_eliminated: boolean;
  created_at: string;
}

export const supabaseDbService = {
  // User operations
  getUserByEmail: async (email: string): Promise<UserProfile | null> => {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data as UserProfile;
  },

  getUserById: async (id: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as UserProfile;
  },

  createUser: async (id: string, username: string, email: string, avatar: string): Promise<UserProfile> => {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id,
          username,
          email,
          avatar,
          coins: 1000,
          gems: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as UserProfile;
  },

  updateUserAvatar: async (id: string, avatar: string): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('users')
      .update({
        avatar,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as UserProfile;
  },

  adjustUserCoins: async (id: string, delta: number): Promise<number> => {
    // First get current coins
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('coins')
      .eq('id', id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const newCoins = Math.max(0, (user?.coins || 0) + delta);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        coins: newCoins,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw new Error(updateError.message);
    return newCoins;
  },

  adjustUserGems: async (id: string, delta: number): Promise<number> => {
    // First get current gems
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('gems')
      .eq('id', id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const newGems = Math.max(0, (user?.gems || 0) + delta);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        gems: newGems,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw new Error(updateError.message);
    return newGems;
  },

  // Game room operations
  createRoom: async (creatorId: string, roomCode: string, maxPlayers: number = 4): Promise<GameRoom> => {
    const { data, error } = await supabase
      .from('game_rooms')
      .insert([
        {
          creator_id: creatorId,
          room_code: roomCode,
          status: 'waiting',
          max_players: maxPlayers,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as GameRoom;
  },

  getRoomByCode: async (roomCode: string): Promise<GameRoom | null> => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error) return null;
    return data as GameRoom;
  },

  getRoomById: async (roomId: string): Promise<GameRoom | null> => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) return null;
    return data as GameRoom;
  },

  updateRoomStatus: async (roomId: string, status: 'waiting' | 'playing' | 'finished'): Promise<GameRoom> => {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'playing') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'finished') {
      updateData.finished_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('game_rooms')
      .update(updateData)
      .eq('id', roomId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as GameRoom;
  },

  // Room player operations
  addPlayerToRoom: async (roomId: string, playerId: string, color: string): Promise<RoomPlayer> => {
    const { data, error } = await supabase
      .from('room_players')
      .insert([
        {
          room_id: roomId,
          player_id: playerId,
          color,
          is_eliminated: false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as RoomPlayer;
  },

  getRoomPlayers: async (roomId: string): Promise<RoomPlayer[]> => {
    const { data, error } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId);

    if (error) throw new Error(error.message);
    return data as RoomPlayer[];
  },

  removePlayerFromRoom: async (roomId: string, playerId: string): Promise<void> => {
    const { error } = await supabase
      .from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('player_id', playerId);

    if (error) throw new Error(error.message);
  },

  updatePlayerElimination: async (roomId: string, playerId: string, isEliminated: boolean): Promise<void> => {
    const { error } = await supabase
      .from('room_players')
      .update({ is_eliminated: isEliminated })
      .eq('room_id', roomId)
      .eq('player_id', playerId);

    if (error) throw new Error(error.message);
  },

  // Game history operations
  recordGameResult: async (
    roomId: string,
    playerId: string,
    placement: number,
    coinsEarned: number,
    durationSeconds: number
  ): Promise<void> => {
    const { error } = await supabase
      .from('game_history')
      .insert([
        {
          room_id: roomId,
          player_id: playerId,
          placement,
          coins_earned: coinsEarned,
          duration_seconds: durationSeconds,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw new Error(error.message);
  },

  // Admin operations
  isUserAdmin: async (userId: string): Promise<boolean> => {
    const { data } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .single();
    return !!data;
  },

  // Store packages operations
  getStorePackages: async (): Promise<any[]> => {
    const { data, error } = await supabaseAdmin
      .from('store_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  updateStorePackage: async (packageId: string, updates: any): Promise<any> => {
    const { data, error } = await supabaseAdmin
      .from('store_packages')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', packageId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  createStorePackage: async (type: string, name: string, amount: number, price: number): Promise<any> => {
    const { data, error } = await supabaseAdmin
      .from('store_packages')
      .insert([{ type, name, amount, price_usd: price }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  deleteStorePackage: async (packageId: string): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('store_packages')
      .delete()
      .eq('id', packageId);

    if (error) throw new Error(error.message);
  },

  // Board themes operations
  getBoardThemes: async (): Promise<any[]> => {
    const { data, error } = await supabaseAdmin
      .from('board_themes')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  createBoardTheme: async (name: string, displayName: string, description: string, imageUrl: string): Promise<any> => {
    const { data, error } = await supabaseAdmin
      .from('board_themes')
      .insert([{ name, display_name: displayName, description, image_url: imageUrl }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updateBoardTheme: async (themeId: string, updates: any): Promise<any> => {
    const { data, error } = await supabaseAdmin
      .from('board_themes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', themeId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  deleteBoardTheme: async (themeId: string): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('board_themes')
      .delete()
      .eq('id', themeId);

    if (error) throw new Error(error.message);
  },

  // Token styles operations
  getTokenStyles: async (): Promise<any[]> => {
    const { data, error } = await supabaseAdmin
      .from('token_styles')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  createTokenStyle: async (name: string, displayName: string, description: string, images?: { image_red?: string; image_yellow?: string; image_green?: string; image_blue?: string }): Promise<any> => {
    const { data, error } = await supabaseAdmin
      .from('token_styles')
      .insert([{ name, display_name: displayName, description, ...images }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updateTokenStyle: async (styleId: string, updates: any): Promise<any> => {
    const { data, error } = await supabaseAdmin
      .from('token_styles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', styleId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // User purchases operations
  getUserPurchases: async (userId: string): Promise<any[]> => {
    const { data, error } = await supabaseAdmin
      .from('user_purchases')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data || [];
  },

  purchaseItem: async (userId: string, itemType: string, itemId: string): Promise<any> => {
    const { data, error } = await supabaseAdmin
      .from('user_purchases')
      .insert([{ user_id: userId, item_type: itemType, item_id: itemId }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  hasUserPurchased: async (userId: string, itemType: string, itemId: string): Promise<boolean> => {
    const { data, error } = await supabaseAdmin
      .from('user_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return !!data;
  },

  // Statistics operations
  getStatistics: async (): Promise<{ activeGames: number; activeUsers: number; totalUsers: number; totalGames: number }> => {
    try {
      // Get total users
      const { count: totalUsersCount } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact' });

      // Get total games completed
      const { count: totalGamesCount } = await supabaseAdmin
        .from('game_history')
        .select('*', { count: 'exact' });

      // Get active games (status = 'playing')
      const { count: activeGamesCount } = await supabaseAdmin
        .from('game_rooms')
        .select('*', { count: 'exact' })
        .eq('status', 'playing');

      // Get active users (users in playing rooms)
      const { data: activeRoomPlayers } = await supabaseAdmin
        .from('room_players')
        .select('player_id')
        .in('room_id',
          (await supabaseAdmin
            .from('game_rooms')
            .select('id')
            .eq('status', 'playing')).data?.map(r => r.id) || []
        );

      const activeUsersSet = new Set(activeRoomPlayers?.map(p => p.player_id) || []);

      return {
        activeGames: activeGamesCount || 0,
        activeUsers: activeUsersSet.size,
        totalUsers: totalUsersCount || 0,
        totalGames: totalGamesCount || 0,
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return { activeGames: 0, activeUsers: 0, totalUsers: 0, totalGames: 0 };
    }
  },
};
