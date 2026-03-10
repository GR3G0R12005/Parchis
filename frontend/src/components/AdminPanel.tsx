import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { authService } from '../services/authService';
import { Coins, Gem, Plus, Edit2, Trash2, Upload, X, Check, AlertCircle, BarChart3, Package, Image, Sparkles, RefreshCw } from 'lucide-react';

interface StorePackage {
  id: string;
  type: 'coins' | 'gems';
  name: string;
  amount: number;
  price_usd: number;
}

interface BoardTheme {
  id: string;
  name: string;
  display_name: string;
  description: string;
  image_url: string;
  is_active: boolean;
  price_gems: number;
}

interface TokenStyle {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
  price_gems: number;
  image_red?: string;
  image_yellow?: string;
  image_green?: string;
  image_blue?: string;
}

interface Statistics {
  activeGames: number;
  activeUsers: number;
  totalUsers: number;
  totalGames: number;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const safeFetch = async (url: string, options?: RequestInit): Promise<any> => {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!text) return null;
  const data = JSON.parse(text);
  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return data;
};

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'packages' | 'boards' | 'tokens'>('dashboard');
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [boards, setBoards] = useState<BoardTheme[]>([]);
  const [tokens, setTokens] = useState<TokenStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<Statistics>({
    activeGames: 0,
    activeUsers: 0,
    totalUsers: 0,
    totalGames: 0,
  });

  // Edit states
  const [editingPackage, setEditingPackage] = useState<Partial<StorePackage> | null>(null);
  const [newPackage, setNewPackage] = useState(false);
  const [newPkgData, setNewPkgData] = useState({ type: 'coins' as 'coins' | 'gems', name: '', amount: 0, price_usd: 0 });
  const [uploadingBoard, setUploadingBoard] = useState(false);
  const [boardFile, setBoardFile] = useState<File | null>(null);
  const [boardPreview, setBoardPreview] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');
  const [boardDisplay, setBoardDisplay] = useState('');
  const [boardPrice, setBoardPrice] = useState(0);
  const [editingBoard, setEditingBoard] = useState<Partial<BoardTheme> | null>(null);

  // Token style upload states
  const [uploadingToken, setUploadingToken] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenDisplay, setTokenDisplay] = useState('');
  const [tokenPrice, setTokenPrice] = useState(0);
  const [tokenColorFiles, setTokenColorFiles] = useState<Record<string, File | null>>({ red: null, yellow: null, green: null, blue: null });
  const [tokenColorPreviews, setTokenColorPreviews] = useState<Record<string, string | null>>({ red: null, yellow: null, green: null, blue: null });

  const loadStats = useCallback(async () => {
    try {
      const data = await safeFetch('/api/admin/statistics', {
        headers: getAuthHeaders(),
      });
      if (data && typeof data.totalUsers === 'number') {
        setStats(data);
      }
    } catch (e) {
      console.error('Stats load failed:', e);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await safeFetch('/api/admin/store-packages', {
        headers: getAuthHeaders(),
      });
      if (Array.isArray(data)) {
        setPackages(data);
      } else {
        setPackages([]);
      }
    } catch (e: any) {
      console.error('Packages load failed:', e);
      setPackages([]);
      setError('Error cargando paquetes: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      const data = await safeFetch('/api/admin/board-themes', {
        headers: getAuthHeaders(),
      });
      if (Array.isArray(data)) {
        setBoards(data);
      } else {
        setBoards([]);
      }
    } catch (e: any) {
      console.error('Boards load failed:', e);
      setBoards([]);
      setError('Error cargando tableros: ' + e.message);
    }
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      const data = await safeFetch('/api/admin/token-styles', {
        headers: getAuthHeaders(),
      });
      if (Array.isArray(data)) {
        setTokens(data);
      } else {
        setTokens([]);
      }
    } catch (e: any) {
      console.error('Tokens load failed:', e);
      setTokens([]);
    }
  }, []);

  useEffect(() => {
    loadPackages();
    loadBoards();
    loadTokens();
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [loadPackages, loadBoards, loadTokens, loadStats]);

  // Auto-dismiss alerts
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleCreatePackage = async () => {
    if (!newPkgData.name || !newPkgData.amount || !newPkgData.price_usd) {
      setError('Completa todos los campos');
      return;
    }
    try {
      setLoading(true);
      await safeFetch('/api/admin/store-packages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPkgData),
      });
      setSuccess('Paquete creado!');
      setNewPackage(false);
      setNewPkgData({ type: 'coins', name: '', amount: 0, price_usd: 0 });
      loadPackages();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePackage = async (pkg: StorePackage) => {
    try {
      setLoading(true);
      await safeFetch(`/api/admin/store-packages/${pkg.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: pkg.name, amount: pkg.amount, price_usd: pkg.price_usd }),
      });
      setSuccess('Paquete actualizado!');
      loadPackages();
      setEditingPackage(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Eliminar este paquete?')) return;
    try {
      setLoading(true);
      await safeFetch(`/api/admin/store-packages/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSuccess('Paquete eliminado!');
      loadPackages();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBoardFileChange = (file: File | null) => {
    setBoardFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBoardPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setBoardPreview(null);
    }
  };

  const handleUploadBoard = async () => {
    if (!boardFile || !boardName || !boardDisplay) {
      setError('Completa todos los campos');
      return;
    }
    try {
      setUploadingBoard(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          await safeFetch('/api/admin/board-themes/upload', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              name: boardName,
              display_name: boardDisplay,
              description: '',
              price_gems: boardPrice,
              file: base64.split(',')[1],
            }),
          });
          setSuccess('Tablero subido!');
          loadBoards();
          setBoardFile(null);
          setBoardPreview(null);
          setBoardName('');
          setBoardDisplay('');
          setBoardPrice(0);
        } catch (e: any) {
          setError(e.message);
        }
        setUploadingBoard(false);
      };
      reader.readAsDataURL(boardFile);
    } catch (e: any) {
      setError(e.message);
      setUploadingBoard(false);
    }
  };

  const handleUpdateBoard = async (board: BoardTheme) => {
    try {
      setLoading(true);
      await safeFetch(`/api/admin/board-themes/${board.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          display_name: board.display_name,
          description: board.description,
          is_active: board.is_active,
          price_gems: board.price_gems,
        }),
      });
      setSuccess('Tablero actualizado!');
      loadBoards();
      setEditingBoard(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm('Eliminar este tablero?')) return;
    try {
      setLoading(true);
      await safeFetch(`/api/admin/board-themes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSuccess('Tablero eliminado!');
      loadBoards();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenColorFile = (color: string, file: File | null) => {
    setTokenColorFiles(prev => ({ ...prev, [color]: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setTokenColorPreviews(prev => ({ ...prev, [color]: reader.result as string }));
      reader.readAsDataURL(file);
    } else {
      setTokenColorPreviews(prev => ({ ...prev, [color]: null }));
    }
  };

  const handleUploadToken = async () => {
    if (!tokenName || !tokenDisplay) { setError('Completa nombre e ID'); return; }
    const hasAny = Object.values(tokenColorFiles).some(f => f !== null);
    if (!hasAny) { setError('Sube al menos una imagen de color'); return; }
    try {
      setUploadingToken(true);
      const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const body: Record<string, any> = {
        name: tokenName,
        display_name: tokenDisplay,
        description: '',
        price_gems: tokenPrice,
      };
      for (const color of ['red', 'yellow', 'green', 'blue']) {
        if (tokenColorFiles[color]) {
          body[`image_${color}`] = await toBase64(tokenColorFiles[color]!);
        }
      }
      await safeFetch('/api/admin/token-styles/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      setSuccess('Fichas subidas!');
      setTokenName(''); setTokenDisplay(''); setTokenPrice(0);
      setTokenColorFiles({ red: null, yellow: null, green: null, blue: null });
      setTokenColorPreviews({ red: null, yellow: null, green: null, blue: null });
      loadTokens();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingToken(false);
    }
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Stats', icon: BarChart3 },
    { id: 'packages' as const, label: 'Packs', icon: Package },
    { id: 'boards' as const, label: 'Boards', icon: Image },
    { id: 'tokens' as const, label: 'Tokens', icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      {/* TABS */}
      <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all text-center',
                activeTab === tab.id
                  ? 'bg-blue-500/30 text-blue-300 shadow-lg'
                  : 'text-white/40 active:bg-white/10'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ALERTS */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 break-all text-xs">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/40 text-green-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm"
        >
          <Check className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{success}</span>
        </motion.div>
      )}

      {/* ==================== DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: stats.activeGames, label: 'Partidas Activas', color: 'blue', sub: 'En juego' },
              { value: stats.activeUsers, label: 'Usuarios Activos', color: 'green', sub: 'Conectados' },
              { value: stats.totalUsers, label: 'Total Usuarios', color: 'purple', sub: 'Registrados' },
              { value: stats.totalGames, label: 'Total Partidas', color: 'yellow', sub: 'Completadas' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  'rounded-2xl p-4 border text-center',
                  stat.color === 'blue' && 'bg-blue-500/10 border-blue-500/30',
                  stat.color === 'green' && 'bg-green-500/10 border-green-500/30',
                  stat.color === 'purple' && 'bg-purple-500/10 border-purple-500/30',
                  stat.color === 'yellow' && 'bg-yellow-500/10 border-yellow-500/30',
                )}
              >
                <div className={cn(
                  'text-3xl font-black mb-1',
                  stat.color === 'blue' && 'text-blue-400',
                  stat.color === 'green' && 'text-green-400',
                  stat.color === 'purple' && 'text-purple-400',
                  stat.color === 'yellow' && 'text-yellow-400',
                )}>
                  {stat.value}
                </div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest leading-tight">{stat.label}</p>
                <p className="text-white/30 text-[9px] mt-1">{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => { loadStats(); loadPackages(); loadBoards(); loadTokens(); }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-center gap-2 text-white/40 text-xs font-bold active:scale-[0.98] transition-transform"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar todo
          </button>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Info</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Se actualiza cada 10 segundos automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* ==================== PACKAGES ==================== */}
      {activeTab === 'packages' && (
        <div className="space-y-3">
          {/* Create new package button */}
          {!newPackage && (
            <button
              onClick={() => setNewPackage(true)}
              className="w-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" /> Crear Paquete
            </button>
          )}

          {/* New package form */}
          {newPackage && (
            <div className="bg-white/5 border border-blue-500/30 rounded-2xl p-4 space-y-3">
              <h3 className="text-white font-bold text-sm">Nuevo Paquete</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewPkgData({ ...newPkgData, type: 'coins' })}
                  className={cn('flex-1 py-2.5 rounded-xl font-bold text-xs transition-all', newPkgData.type === 'coins' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40' : 'bg-white/5 text-white/40')}
                >
                  Monedas
                </button>
                <button
                  onClick={() => setNewPkgData({ ...newPkgData, type: 'gems' })}
                  className={cn('flex-1 py-2.5 rounded-xl font-bold text-xs transition-all', newPkgData.type === 'gems' ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' : 'bg-white/5 text-white/40')}
                >
                  Gemas
                </button>
              </div>
              <input
                type="text"
                value={newPkgData.name}
                onChange={(e) => setNewPkgData({ ...newPkgData, name: e.target.value })}
                placeholder="Nombre del paquete"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-white/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={newPkgData.amount || ''}
                  onChange={(e) => setNewPkgData({ ...newPkgData, amount: parseInt(e.target.value) || 0 })}
                  placeholder="Cantidad"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-white/30"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newPkgData.price_usd || ''}
                  onChange={(e) => setNewPkgData({ ...newPkgData, price_usd: parseFloat(e.target.value) || 0 })}
                  placeholder="Precio USD"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-white/30"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePackage}
                  disabled={loading}
                  className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50"
                >
                  Crear
                </button>
                <button
                  onClick={() => setNewPackage(false)}
                  className="flex-1 bg-white/10 text-white/70 font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {packages.length === 0 && !loading && (
            <div className="text-center py-10 text-white/30">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold">No hay paquetes</p>
              <p className="text-xs mt-1">Crea uno con el boton de arriba</p>
            </div>
          )}

          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              layout
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              {editingPackage?.id === pkg.id ? (
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Nombre</label>
                    <input
                      type="text"
                      value={editingPackage.name || ''}
                      onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Cantidad</label>
                      <input
                        type="number"
                        value={editingPackage.amount || ''}
                        onChange={(e) => setEditingPackage({ ...editingPackage, amount: parseInt(e.target.value) })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Precio (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingPackage.price_usd || ''}
                        onChange={(e) => setEditingPackage({ ...editingPackage, price_usd: parseFloat(e.target.value) })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleUpdatePackage(editingPackage as StorePackage)}
                      disabled={loading}
                      className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingPackage(null)}
                      className="flex-1 bg-white/10 text-white/70 font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      pkg.type === 'coins' ? 'bg-yellow-500/20' : 'bg-purple-500/20'
                    )}>
                      {pkg.type === 'coins'
                        ? <Coins className="w-5 h-5 text-yellow-400" />
                        : <Gem className="w-5 h-5 text-purple-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm truncate">{pkg.name}</h3>
                      <p className="text-white/40 text-xs">
                        {pkg.amount.toLocaleString()} {pkg.type === 'coins' ? 'monedas' : 'gemas'}
                      </p>
                    </div>
                    <span className="text-yellow-400 font-black text-lg">${pkg.price_usd}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditingPackage(pkg)}
                      className="flex-1 bg-blue-500/15 text-blue-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="flex-1 bg-red-500/15 text-red-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ==================== BOARDS ==================== */}
      {activeTab === 'boards' && (
        <div className="space-y-4">
          {/* Upload Form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" /> Subir Tablero
            </h3>

            {/* File picker with preview */}
            <label className="block cursor-pointer">
              <div className={cn(
                'w-full rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden',
                boardPreview ? 'border-green-500/50 p-0' : 'border-white/20 p-6 active:border-blue-500/50'
              )}>
                {boardPreview ? (
                  <div className="relative w-full">
                    <img src={boardPreview} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      onClick={(e) => { e.preventDefault(); handleBoardFileChange(null); }}
                      className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Image className="w-8 h-8 text-white/30 mb-2" />
                    <p className="text-white/40 text-xs font-bold">Toca para seleccionar imagen</p>
                    <p className="text-white/20 text-[10px]">PNG recomendado</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => handleBoardFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
              placeholder="ID del tema (ej: neon, royal)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-white/30"
            />

            <input
              type="text"
              value={boardDisplay}
              onChange={(e) => setBoardDisplay(e.target.value)}
              placeholder="Nombre visible (ej: Neon Board)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-white/30"
            />

            <input
              type="number"
              value={boardPrice}
              onChange={(e) => setBoardPrice(parseInt(e.target.value) || 0)}
              placeholder="Precio en gemas (0 = gratis)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-white/30"
            />

            <button
              onClick={handleUploadBoard}
              disabled={uploadingBoard || !boardFile || !boardName || !boardDisplay}
              className="w-full bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-transform"
            >
              <Upload className="w-4 h-4" />
              {uploadingBoard ? 'Subiendo...' : 'Subir Tablero'}
            </button>
          </div>

          {/* Existing boards */}
          <div className="space-y-3">
            {boards.length === 0 && (
              <div className="text-center py-8 text-white/30">
                <Image className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold">No hay tableros</p>
                <p className="text-xs mt-1">Sube uno con el formulario de arriba</p>
              </div>
            )}

            {boards.map((board) => (
              <motion.div
                key={board.id}
                layout
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              >
                {editingBoard?.id === board.id ? (
                  <div className="p-4 space-y-3">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Nombre visible</label>
                      <input
                        type="text"
                        value={editingBoard.display_name || ''}
                        onChange={(e) => setEditingBoard({ ...editingBoard, display_name: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Descripcion</label>
                      <textarea
                        value={editingBoard.description || ''}
                        onChange={(e) => setEditingBoard({ ...editingBoard, description: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      <label className="text-xs text-white/80 font-bold">Activo</label>
                      <input
                        type="checkbox"
                        checked={editingBoard.is_active ?? true}
                        onChange={(e) => setEditingBoard({ ...editingBoard, is_active: e.target.checked })}
                        className="w-4 h-4 accent-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Precio en Gemas</label>
                      <input
                        type="number"
                        value={editingBoard.price_gems || 0}
                        onChange={(e) => setEditingBoard({ ...editingBoard, price_gems: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateBoard(editingBoard as BoardTheme)}
                        disabled={loading}
                        className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingBoard(null)}
                        className="flex-1 bg-white/10 text-white/70 font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={board.image_url}
                      alt={board.display_name}
                      className="w-full h-36 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23222" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%23555" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-bold text-sm">{board.display_name}</h3>
                          <p className="text-white/30 text-[10px] font-mono">{board.name}</p>
                        </div>
                        <span className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold',
                          board.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        )}>
                          {board.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-400 font-bold text-sm">{board.price_gems} 💎</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingBoard(board)}
                            className="bg-blue-500/15 text-blue-300 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteBoard(board.id)}
                            className="bg-red-500/15 text-red-300 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TOKENS ==================== */}
      {activeTab === 'tokens' && (
        <div className="space-y-4">
          {/* Upload Form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-400" /> Subir Fichas Custom
            </h3>

            {/* 4 color image pickers */}
            <div className="grid grid-cols-2 gap-3">
              {(['red', 'yellow', 'green', 'blue'] as const).map((color) => {
                const colorLabels: Record<string, string> = { red: 'Rojo', yellow: 'Amarillo', green: 'Verde', blue: 'Azul' };
                const colorBg: Record<string, string> = { red: '#FF4081', yellow: '#FFEB3B', green: '#00E676', blue: '#448AFF' };
                const preview = tokenColorPreviews[color];
                return (
                  <label key={color} className="block cursor-pointer">
                    <div className={cn(
                      'w-full rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden',
                      preview ? 'border-green-500/50 p-0' : 'border-white/20 p-4 active:border-purple-500/50'
                    )}>
                      {preview ? (
                        <div className="relative w-full">
                          <img src={preview} alt={color} className="w-full h-20 object-cover" />
                          <button
                            onClick={(e) => { e.preventDefault(); handleTokenColorFile(color, null); }}
                            className="absolute top-1 right-1 bg-black/60 p-1 rounded-lg"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full mb-1.5 border-2 border-white/20" style={{ backgroundColor: colorBg[color] }} />
                          <p className="text-white/40 text-[10px] font-bold">{colorLabels[color]}</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleTokenColorFile(color, e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                );
              })}
            </div>

            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
              placeholder="ID del estilo (ej: dragons, pixels)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/30"
            />

            <input
              type="text"
              value={tokenDisplay}
              onChange={(e) => setTokenDisplay(e.target.value)}
              placeholder="Nombre visible (ej: Dragon Tokens)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/30"
            />

            <input
              type="number"
              value={tokenPrice}
              onChange={(e) => setTokenPrice(parseInt(e.target.value) || 0)}
              placeholder="Precio en gemas (0 = gratis)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/30"
            />

            <button
              onClick={handleUploadToken}
              disabled={uploadingToken || !tokenName || !tokenDisplay}
              className="w-full bg-purple-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-transform"
            >
              <Upload className="w-4 h-4" />
              {uploadingToken ? 'Subiendo...' : 'Subir Fichas'}
            </button>
          </div>

          {/* Existing token styles */}
          <div className="space-y-3">
            {tokens.length === 0 && (
              <div className="text-center py-8 text-white/30">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold">No hay fichas custom</p>
                <p className="text-xs mt-1">Sube un set con el formulario de arriba</p>
              </div>
            )}

            {tokens.map((tok) => (
              <motion.div
                key={tok.id}
                layout
                className="bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-sm">{tok.display_name}</h3>
                    <p className="text-white/30 text-[10px] font-mono">{tok.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-bold text-sm">{tok.price_gems} 💎</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold',
                      tok.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    )}>
                      {tok.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  {(['red', 'yellow', 'green', 'blue'] as const).map((color) => {
                    const img = tok[`image_${color}`];
                    const fallback: Record<string, string> = { red: '#FF4081', yellow: '#FFEB3B', green: '#00E676', blue: '#448AFF' };
                    return (
                      <div key={color} className="flex flex-col items-center gap-1">
                        {img ? (
                          <img src={img} alt={color} className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-lg" />
                        ) : (
                          <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                            <span className="text-white/20 text-[8px]">N/A</span>
                          </div>
                        )}
                        <span className="text-[8px] text-white/30 uppercase">{color}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
