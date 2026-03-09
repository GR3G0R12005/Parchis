export interface UserProfile {
    id: string;
    username: string;
    email: string;
    coins: number;
    gems: number;
    avatar: string;
    created_at: string;
}

export interface Room {
    id: string;
    creatorId: string;
    players: string[];
    status: 'waiting' | 'playing';
}

const TOKEN_KEY = 'parchis_jwt_token';
const USER_KEY = 'parchis_user_data';
const BASE_URL = '/api';

export const authService = {
    // Get stored JWT token
    getToken: (): string | null => {
        return localStorage.getItem(TOKEN_KEY);
    },

    // Set JWT token
    setToken: (token: string) => {
        localStorage.setItem(TOKEN_KEY, token);
    },

    // Current session (cached locally)
    getCurrentUser: (): UserProfile | null => {
        const data = localStorage.getItem(USER_KEY);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    },

    // Set current user data
    setCurrentUser: (user: UserProfile) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    // Register
    register: async (username: string, email: string, password: string, customAvatar?: string): Promise<UserProfile> => {
        const avatar = customAvatar || `https://picsum.photos/seed/${username}/100/100`;
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, avatar })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to register');

        // Store JWT token and user data
        const { access_token, ...user } = data;
        if (access_token) {
            authService.setToken(access_token);
        }
        authService.setCurrentUser(user);
        return user;
    },

    // Login
    login: async (email: string, password: string): Promise<UserProfile> => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid credentials');

        // Store JWT token and user data
        const { access_token, ...user } = data;
        if (access_token) {
            authService.setToken(access_token);
        }
        authService.setCurrentUser(user);
        return user;
    },

    // Logout
    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    updateAvatar: async (id: string, avatar: string) => {
        const token = authService.getToken();
        const res = await fetch(`${BASE_URL}/auth/update-avatar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ id, avatar })
        });
        const data = await res.json();

        // Update local user data
        if (res.ok) {
            const user = authService.getCurrentUser();
            if (user) {
                const updated = { ...user, avatar: data.avatar };
                authService.setCurrentUser(updated);
            }
        }
        return data;
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
