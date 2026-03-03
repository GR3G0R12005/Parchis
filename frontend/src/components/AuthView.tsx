import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';
import { cn } from '../utils';

export const AuthView: React.FC<{ onAuthSuccess: (user: any) => void }> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate network delay for a more "premium" feel
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            let user;
            if (isLogin) {
                user = await authService.login(email);
            } else {
                const current = authService.getCurrentUser();
                user = await authService.register(username, email, current?.avatar);
            }
            onAuthSuccess(user);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred during authentication');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FF3D0033] rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#00E5FF33] rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative">
                        <div className="mb-10 text-center">
                            <h1 className="font-heading text-5xl text-white mb-2 tracking-tighter">PARCHIS</h1>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs opacity-60">
                                {isLogin ? 'Welcome Back' : 'Join the game'}
                            </p>
                            <div className="mt-2 inline-block px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Shared Cloud Persistence</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <AnimatePresence mode="wait">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="relative"
                                    >
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Username"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-bold"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-bold"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    placeholder="Password (Local Only)"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-bold"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-center uppercase tracking-wider text-[10px]">
                                    {error}
                                </p>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={loading}
                                className={cn(
                                    "w-full py-4 rounded-2xl font-heading text-xl tracking-widest flex items-center justify-center gap-2 transition-all",
                                    loading ? "bg-slate-700 opacity-50 cursor-not-allowed" : "bg-white text-slate-900 shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.3)]"
                                )}
                            >
                                {loading ? 'PROCESSING...' : (isLogin ? 'SIGN IN' : 'GET STARTED')}
                                {!loading && <ArrowRight className="w-5 h-5" />}
                            </motion.button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-white/5 text-center">
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-slate-400 hover:text-white font-bold text-sm transition-colors"
                            >
                                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
