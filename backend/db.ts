import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('parchis.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    coins INTEGER DEFAULT 1000,
    avatar TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id TEXT,
    friend_id TEXT,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(uid),
    FOREIGN KEY (friend_id) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    sender_id TEXT,
    receiver_id TEXT,
    status TEXT DEFAULT 'pending',
    PRIMARY KEY (sender_id, receiver_id),
    FOREIGN KEY (sender_id) REFERENCES users(uid),
    FOREIGN KEY (receiver_id) REFERENCES users(uid)
  );
`);

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    coins: number;
    avatar: string;
    createdAt: string;
}

export const dbService = {
    getUserByEmail: (email: string): UserProfile | null => {
        return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserProfile | null;
    },

    getUserByUid: (uid: string): UserProfile | null => {
        return db.prepare('SELECT * FROM users WHERE uid = ?').get(uid) as UserProfile | null;
    },

    createUser: (username: string, email: string, avatar: string): UserProfile => {
        const uid = uuidv4().substring(0, 8);
        const createdAt = new Date().toISOString();
        db.prepare('INSERT INTO users (uid, username, email, avatar, createdAt) VALUES (?, ?, ?, ?, ?)').run(
            uid, username, email, avatar, createdAt
        );
        return { uid, username, email, avatar, createdAt, coins: 1000 };
    },

    updateUserAvatar: (uid: string, avatar: string) => {
        db.prepare('UPDATE users SET avatar = ? WHERE uid = ?').run(avatar, uid);
    },

    adjustUserCoins: (uid: string, delta: number): number => {
        db.prepare(`
            UPDATE users
            SET coins = CASE
                WHEN coins + ? < 0 THEN 0
                ELSE coins + ?
            END
            WHERE uid = ?
        `).run(delta, delta, uid);
        const row = db.prepare('SELECT coins FROM users WHERE uid = ?').get(uid) as { coins: number } | undefined;
        return row?.coins ?? 0;
    },

    searchUsers: (query: string, excludeUid: string): UserProfile[] => {
        return db.prepare('SELECT * FROM users WHERE username LIKE ? AND uid != ? LIMIT 10').all(
            `%${query}%`, excludeUid
        ) as UserProfile[];
    },

    sendFriendRequest: (senderUid: string, receiverUid: string) => {
        db.prepare('INSERT OR IGNORE INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)').run(
            senderUid, receiverUid
        );
    },

    getFriendRequests: (receiverUid: string): UserProfile[] => {
        return db.prepare(`
            SELECT u.* FROM users u 
            JOIN friend_requests fr ON u.uid = fr.sender_id 
            WHERE fr.receiver_id = ? AND fr.status = 'pending'
        `).all(receiverUid) as UserProfile[];
    },

    acceptFriendRequest: (receiverUid: string, senderUid: string) => {
        const trans = db.transaction(() => {
            db.prepare('DELETE FROM friend_requests WHERE sender_id = ? AND receiver_id = ?').run(senderUid, receiverUid);
            db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').run(receiverUid, senderUid);
            db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').run(senderUid, receiverUid);
        });
        trans();
    },

    getFriends: (uid: string): UserProfile[] => {
        return db.prepare(`
            SELECT u.* FROM users u 
            JOIN friends f ON u.uid = f.friend_id 
            WHERE f.user_id = ?
        `).all(uid) as UserProfile[];
    }
};
