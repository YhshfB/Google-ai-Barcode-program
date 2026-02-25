
import React, { useState, useEffect } from 'react';
import { 
  Barcode, 
  History, 
  Trash2, 
  Download, 
  ChevronRight, 
  Search,
  AlertCircle,
  Plus,
  Minus,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Zap,
  Moon,
  Sun,
  LogOut,
  Lock,
  User as UserIcon,
  Edit3,
  FileText,
  Shield,
  Users,
  X,
  Check,
  EyeOff,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarcodeData } from './types';
import { validateEAN13, calculateEAN13Checksum } from './utils/ean13';
import BarcodeRenderer from './components/BarcodeRenderer';

const SUPABASE_URL = 'https://kxwbonrpegsxmkuhsixe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PFudUPi53dptzauY1Af7oA_OiZIl5DJ';

const supabaseFetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Supabase hatası');
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

interface DBUser {
  id: string;
  username: string;
  password: string;
  role: string;
  created_at: string;
}

const App: React.FC = () => {
  const getDefaultFileName = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '.');
    return `${dateStr}-Barkodlar`;
  };

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('is_logged_in') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<DBUser | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Admin Panel State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [dbUsers, setDbUsers] = useState<DBUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [addingUser, setAddingUser] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState('');

  // Barcode State
  const [inputValue, setInputValue] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const [productCodeValue, setProductCodeValue] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [history, setHistory] = useState<BarcodeData[]>([]);
  const [currentBarcode, setCurrentBarcode] = useState<BarcodeData | null>(null);
  const [batchResults, setBatchResults] = useState<BarcodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; message: string }>({ isValid: false, message: '' });
  const [exportFileName, setExportFileName] = useState(getDefaultFileName());

  // Theme effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Persist history
  useEffect(() => {
    const saved = localStorage.getItem('barcode_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('barcode_history', JSON.stringify(history));
  }, [history]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await supabaseFetch(`/users?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=*`);
      if (data && data.length > 0) {
        const user = data[0] as DBUser;
        setIsAuthenticated(true);
        setCurrentUser(user);
        localStorage.setItem('is_logged_in', 'true');
        localStorage.setItem('current_user', JSON.stringify(user));
      } else {
        setLoginError('Hatalı kullanıcı adı veya şifre.');
      }
    } catch {
      setLoginError('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('current_user');
  };

  // Admin Panel Handlers
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await supabaseFetch('/users?select=*&order=created_at.asc');
      setDbUsers(data);
    } catch {
      setAdminError('Kullanıcılar yüklenemedi.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const openAdminPanel = () => {
    setShowAdminPanel(true);
    setAdminError('');
    setAdminSuccess('');
    fetchUsers();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setAdminError('Kullanıcı adı ve şifre zorunludur.');
      return;
    }
    setAddingUser(true);
    setAdminError('');
    setAdminSuccess('');
    try {
      await supabaseFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword.trim(), role: newRole }),
      });
      setAdminSuccess(`"${newUsername}" kullanıcısı eklendi.`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      fetchUsers();
    } catch (err: any) {
      setAdminError(err.message || 'Kullanıcı eklenemedi. Kullanıcı adı zaten var olabilir.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleUpdatePassword = async (user: DBUser) => {
    if (!editingPassword.trim()) {
      setAdminError('Şifre boş olamaz.');
      return;
    }
    try {
      await supabaseFetch(`/users?id=eq.${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: editingPassword.trim() }),
      });
      setAdminSuccess(`"${user.username}" şifresi güncellendi.`);
      setEditingUserId(null);
      setEditingPassword('');
      fetchUsers();
    } catch {
      setAdminError('Şifre güncellenemedi.');
    }
  };

  const handleDeleteUser = async (user: DBUser) => {
    if (user.username === 'admin') {
      setAdminError('Admin kullanıcısı silinemez.');
      return;
    }
    if (!window.confirm(`"${user.username}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    try {
      await supabaseFetch(`/users?id=eq.${user.id}`, { method: 'DELETE' });
      setAdminSuccess(`"${user.username}" silindi.`);
      fetchUsers();
    } catch {
      setAdminError('Kullanıcı silinemedi.');
    }
  };

  // Barcode Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 13);
    setInputValue(val);
    if (val.length >= 12) {
      const v = validateEAN13(val);
      setValidation({ isValid: v.isValid, message: v.message });
    } else {
      setValidation({ isValid: false, message: 'En az 12 rakam giriniz.' });
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setQuantity(Math.max(1, val));
    } else {
      setQuantity(1);
    }
  };

  const incrementString = (str: string, increment: number): string => {
    if (!str) return '';
    const match = str.match(/(.*?)(\d+)$/);
    if (!match) return str + (increment > 0 ? `-${increment}` : '');
    const prefix = match[1];
    const numberStr = match[2];
    const newNumber = (BigInt(numberStr) + BigInt(increment)).toString();
    const paddedNumber = newNumber.padStart(numberStr.length, '0');
    return prefix + paddedNumber;
  };

  const generateBarcode = async () => {
    if (!validation.isValid && inputValue.length < 12) return;
    setLoading(true);
    const results: BarcodeData[] = [];
    const baseNum = BigInt(inputValue.substring(0, 12));
    for (let i = 0; i < quantity; i++) {
      const currentBase = (baseNum + BigInt(i)).toString().padStart(12, '0');
      const checkDigit = calculateEAN13Checksum(currentBase);
      const finalCode = currentBase + checkDigit;
      const finalProductCode = productCodeValue ? incrementString(productCodeValue, i) : undefined;
      const newBarcode: BarcodeData = {
        id: Math.random().toString(36).substr(2, 9),
        code: finalCode,
        label: labelValue ? (quantity > 1 ? `${labelValue} #${i + 1}` : labelValue) : '',
        productCode: finalProductCode,
        timestamp: Date.now(),
      };
      results.push(newBarcode);
    }
    setBatchResults(results);
    setCurrentBarcode(results[0]);
    setHistory(prev => [...results, ...prev].slice(0, 500));
    setLoading(false);
  };

  const updateBatchLabel = (id: string, newLabel: string) => {
    const updated = batchResults.map(item => item.id === id ? { ...item, label: newLabel } : item);
    setBatchResults(updated);
    setHistory(prev => prev.map(item => item.id === id ? { ...item, label: newLabel } : item));
    if (currentBarcode?.id === id) setCurrentBarcode({ ...currentBarcode, label: newLabel } as BarcodeData);
  };

  const removeFromBatch = (id: string) => {
    setBatchResults(prev => prev.filter(item => item.id !== id));
    setHistory(prev => prev.filter(item => item.id !== id));
    if (currentBarcode?.id === id) {
      const nextItem = batchResults.find(item => item.id !== id);
      setCurrentBarcode(nextItem || null);
    }
  };

  const exportToExcel = (data: BarcodeData[], fileName: string) => {
    const worksheetData = data.map(item => ({
      'Ürün Adı': item.label || 'İsimsiz Ürün',
      'Ürün Kodu': item.productCode || '',
      'Barkod': item.code,
      'Oluşturulma Tarihi': new Date(item.timestamp).toLocaleString('tr-TR')
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const wscols = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 25 }];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Barkodlar");
    const fullFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(workbook, fullFileName);
  };

  const downloadBarcode = (code: string, format: 'png' | 'svg' = 'png', fileName?: string) => {
    const container = document.querySelector(`[data-barcode="${code}"]`);
    const svg = container?.querySelector('svg');
    if (!svg) return;
    const name = fileName || `barcode-${code}`;
    if (format === 'svg') {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${name}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${name}.png`;
        link.href = url;
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const downloadAllInBatch = async (format: 'png' | 'svg') => {
    for (let i = 0; i < batchResults.length; i++) {
      const item = batchResults[i];
      setTimeout(() => {
        downloadBarcode(item.code, format, `${(item.label || 'barcode').replace(/[^a-z0-9]/gi, '_')}_${item.code}`);
      }, i * 100);
    }
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (currentBarcode?.id === id) setCurrentBarcode(null);
  };

  const clearHistory = () => {
    if (window.confirm('Tüm geçmişi silmek istediğinize emin misiniz?')) {
      setHistory([]);
      setCurrentBarcode(null);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6 relative overflow-hidden">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative z-10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
              <Barcode className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">BarCode Pro</h1>
            <p className="text-slate-400 text-sm">Devam etmek için giriş yapın</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Kullanıcı Adı</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      
      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-indigo-600">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">Admin Paneli</h2>
              </div>
              <button onClick={() => setShowAdminPanel(false)} className="p-2 rounded-xl hover:bg-white/20 text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

              {/* Feedback */}
              {adminError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {adminError}
                </div>
              )}
              {adminSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm p-3 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {adminSuccess}
                </div>
              )}

              {/* Add User Form */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-500" /> Yeni Kullanıcı Ekle
                </h3>
                <form onSubmit={handleAddUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kullanıcı Adı</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="kullanici_adi"
                        className="w-full mt-1 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Şifre</label>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="şifre"
                        className="w-full mt-1 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                    >
                      <option value="user">Kullanıcı</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {addingUser ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Kullanıcı Ekle</>}
                  </button>
                </form>
              </div>

              {/* User List */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" /> Kullanıcılar ({dbUsers.length})
                </h3>
                {loadingUsers ? (
                  <div className="text-center py-6 text-slate-400 text-sm">Yükleniyor...</div>
                ) : (
                  <div className="space-y-2">
                    {dbUsers.map((user) => (
                      <div key={user.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              {user.role === 'admin' ? <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <UserIcon className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.username}</p>
                              <p className="text-[10px] text-slate-400">{user.role === 'admin' ? 'Admin' : 'Kullanıcı'} · {new Date(user.created_at).toLocaleDateString('tr-TR')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingUserId(editingUserId === user.id ? null : user.id);
                                setEditingPassword('');
                                setAdminError('');
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                              title="Şifre Değiştir"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {user.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Kullanıcıyı Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {editingUserId === user.id && (
                          <div className="px-3 pb-3 flex gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                            <input
                              type="text"
                              value={editingPassword}
                              onChange={(e) => setEditingPassword(e.target.value)}
                              placeholder="Yeni şifre..."
                              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                            />
                            <button
                              onClick={() => handleUpdatePassword(user)}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-1"
                            >
                              <Check className="w-4 h-4" /> Kaydet
                            </button>
                            <button
                              onClick={() => { setEditingUserId(null); setEditingPassword(''); }}
                              className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col h-screen">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Barcode className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight dark:text-white">BarCode Pro</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Geçmiş</span>
            <History className="w-4 h-4 text-slate-400" />
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Search className="text-slate-300 dark:text-slate-700 w-6 h-6" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Henüz barkod oluşturulmadı.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => exportToExcel(history, exportFileName)}
                className="w-full flex items-center justify-center gap-2 mb-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Geçmişi Excel Olarak İndir
              </button>
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentBarcode(item); setBatchResults([]); }}
                  className={`w-full group text-left p-3 rounded-xl transition-all border ${
                    currentBarcode?.id === item.id
                      ? 'border-indigo-200 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-100 dark:ring-indigo-800'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${currentBarcode?.id === item.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {item.label || 'İsimsiz Ürün'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.productCode && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 rounded">{item.productCode}</span>}
                        <p className="mono text-xs text-slate-400 dark:text-slate-500">{item.code}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 rounded-md text-slate-400 dark:text-slate-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
          {/* Current user info */}
          {currentUser && (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${currentUser.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {currentUser.role === 'admin' ? <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <UserIcon className="w-3.5 h-3.5 text-slate-400" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{currentUser.username}</p>
                <p className="text-[10px] text-slate-400">{currentUser.role === 'admin' ? 'Admin' : 'Kullanıcı'}</p>
              </div>
            </div>
          )}

          {/* Admin Panel Button - only for admins */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={openAdminPanel}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl text-xs font-bold transition-all border border-indigo-100 dark:border-indigo-800/50"
            >
              <Shield className="w-4 h-4" />
              Admin Paneli
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700/50"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6 md:p-10 transition-colors">
        <div className="max-w-4xl mx-auto space-y-8">

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                    <Zap className="w-5 h-5 text-indigo-500" /> Barkod Yapılandırma
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Ürün Grubu (Opsiyonel)</label>
                        <input type="text" value={labelValue} onChange={(e) => setLabelValue(e.target.value)} placeholder="Zeytinyağı" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Ürün Kodu Başlangıç</label>
                        <input type="text" value={productCodeValue} onChange={(e) => setProductCodeValue(e.target.value)} placeholder="SKU-100" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">EAN-13 Başlangıç (12 Hane)</label>
                      <div className="relative">
                        <input type="text" value={inputValue} onChange={handleInputChange} placeholder="869000012345" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 outline-none transition-all mono tracking-widest dark:text-white ${validation.isValid ? 'border-emerald-200 focus:ring-emerald-500' : 'border-slate-200 focus:ring-indigo-500'}`} />
                      </div>
                      <p className={`text-[11px] font-medium ml-1 ${inputValue.length >= 12 && validation.isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {inputValue.length >= 12 ? validation.message : 'Kalan: ' + (12 - inputValue.length) + ' rakam'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Adet</label>
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl">
                        <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600"><Minus className="w-3.5 h-3.5" /></button>
                        <input type="number" min="1" value={quantity} onChange={handleQuantityChange} className="bg-transparent text-center font-bold text-indigo-600 dark:text-indigo-400 w-full outline-none" />
                        <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={generateBarcode} disabled={loading || inputValue.length < 12} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Barkodları Üret <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                </button>
              </div>

              <div className="flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 min-h-[300px]">
                {currentBarcode ? (
                  <div className="space-y-6 w-full text-center" data-barcode={currentBarcode.code}>
                    <div className="scale-110">
                      <BarcodeRenderer code={currentBarcode.code} width={240} height={120} />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button onClick={() => downloadBarcode(currentBarcode.code, 'svg')} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-800">
                        <FileCode className="w-3.5 h-3.5" /> SVG
                      </button>
                      <button onClick={() => downloadBarcode(currentBarcode.code, 'png')} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                        <Download className="w-3.5 h-3.5" /> PNG
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Barcode className="w-12 h-12 text-slate-200 mx-auto" />
                    <p className="text-slate-400 text-sm">Barkod Önizlemesi</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ürün İsimlerini Girin</h3>
                    <div className="text-[10px] text-indigo-600 font-black bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded-md uppercase tracking-widest">Adım 2: İsimlendirme</div>
                  </div>
                  <div className="max-w-sm space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Excel Dosya Adı</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={exportFileName}
                        onChange={(e) => setExportFileName(e.target.value)}
                        placeholder="Dosya adı belirleyin..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => exportToExcel(batchResults, exportFileName)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
                    <FileSpreadsheet className="w-5 h-5" /> Excel Listesini İndir (.xlsx)
                  </button>
                  <button onClick={() => downloadAllInBatch('png')} className="flex items-center gap-2 px-4 py-3 bg-slate-700 dark:bg-slate-600 text-white rounded-xl text-sm font-bold shadow-lg transition-all">
                    <ImageIcon className="w-4 h-4" /> Görselleri İndir
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">#</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ürün Kodu</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Barkod (EAN-13)</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ürün Adı (Buraya Yazın)</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {batchResults.map((item, idx) => (
                      <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all ${currentBarcode?.id === item.id ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                        <td className="p-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-4">
                          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-400 mono">{item.productCode}</span>
                        </td>
                        <td className="p-4 mono text-xs font-medium text-indigo-600 dark:text-indigo-400">{item.code}</td>
                        <td className="p-4 w-full">
                          <div className="relative group">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => updateBatchLabel(item.id, e.target.value)}
                              placeholder="Örn: Sızma Zeytinyağı 500ml..."
                              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => removeFromBatch(item.id)}
                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Barkodu Listeden Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
