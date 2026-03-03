export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    coins: number;
    avatar: string;
    createdAt: string;
    friends?: string[];
    friendRequests?: string[];
}

export interface Room {
    id: string;
    creatorId: string;
    players: string[];
    status: 'waiting' | 'playing';
}

const SESSION_KEY = 'parchis_active_session';
// Use the local IP discovered earlier or localhost. Since we want to test on mobile, we can use a dynamic approach.
// For now, I'll use the IP found (10.0.0.12) as a default, but it can be changed to window.location.hostname for ease.
const BASE_URL = '/api';

export const authService = {
    // Current session (cached locally)
    getCurrentUser: (): UserProfile | null => {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) return null;
        return JSON.parse(data);
    },

    // Register
    register: async (username: string, email: string, customAvatar?: string): Promise<UserProfile> => {
        const avatar = customAvatar || `https://picsum.photos/seed/${username}/100/100`;
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, avatar })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to register');
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        return data;
    },

    // Login
    login: async (email: string): Promise<UserProfile> => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'User not found');
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        return data;
    },

    // Logout
    logout: () => {
        localStorage.removeItem(SESSION_KEY);
    },

    updateAvatar: async (uid: string, avatar: string) => {
        const res = await fetch(`${BASE_URL}/auth/update-avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, avatar })
        });
        return await res.json();
    },

    // Social
    searchUsers: async (query: string): Promise<UserProfile[]> => {
        const current = authService.getCurrentUser();
        if (!current) return [];
        const res = await fetch(`${BASE_URL}/social/search?q=${query}&exclude=${current.uid}`);
        return await res.json();
    },

    sendFriendRequest: async (targetUid: string) => {
        const current = authService.getCurrentUser();
        if (!current) return;
        await fetch(`${BASE_URL}/social/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderUid: current.uid, receiverUid: targetUid })
        });
    },

    getFriendRequests: async (): Promise<UserProfile[]> => {
        const current = authService.getCurrentUser();
        if (!current) return [];
        const res = await fetch(`${BASE_URL}/social/requests/${current.uid}`);
        return await res.json();
    },

    acceptFriendRequest: async (senderUid: string) => {
        const current = authService.getCurrentUser();
        if (!current) return;
        await fetch(`${BASE_URL}/social/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverUid: current.uid, senderUid })
        });
    },

    getFriendsDetails: async (): Promise<UserProfile[]> => {
        const current = authService.getCurrentUser();
        if (!current) return [];
        const res = await fetch(`${BASE_URL}/social/friends/${current.uid}`);
        return await res.json();
    },

    // Room Methods (Still mainly local/socket based on server map for now)
    // But we use the SAME server logic as before.
    createPrivateRoom: (): string => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    },

    getRoom: async (code: string): Promise<Room | null> => {
        // Rooms are handled by socket.io on the shared server now.
        // We'll trust the room-update events from the socket.
        return null; // This will trigger socket join logic in App.tsx
    }
};
