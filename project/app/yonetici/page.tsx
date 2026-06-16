'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useAuth, ADMIN_EMAIL } from '@/contexts/AuthContext';
import {
  Shield,
  Users,
  Plus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  RefreshCw,
  Copy,
  Check,
  Search,
  Calendar,
  KeyRound,
  X,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserRecord {
  uid: string;
  email: string;
  shopName: string;
  createdAt: number;
  storedPassword?: string;
}

export default function YoneticiPage() {
  const { user, isAdmin, adminGetAllUsers, adminCreateUser, adminResetUserPassword } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', shopName: '' });
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/panel');
      return;
    }
    loadUsers();
  }, [isAdmin]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetAllUsers();
      // Exclude admin's own record from the list
      setUsers(data.filter((u) => u.email !== ADMIN_EMAIL).sort((a, b) => b.createdAt - a.createdAt));
    } catch (err: any) {
      toast.error('Kullanıcılar yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [adminGetAllUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.shopName) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser(createForm.email, createForm.password, createForm.shopName);
      toast.success('Kullanıcı oluşturuldu: ' + createForm.email);
      setShowCreate(false);
      setCreateForm({ email: '', password: '', shopName: '' });
      loadUsers();
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'Bu e-posta zaten kayıtlı' :
        err.code === 'auth/invalid-email' ? 'Geçersiz e-posta adresi' :
        err.code === 'auth/weak-password' ? 'Şifre çok zayıf' :
        err.message || 'Bir hata oluştu';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    setResettingEmail(email);
    try {
      await adminResetUserPassword(email);
      toast.success('Şifre sıfırlama e-postası gönderildi: ' + email);
    } catch (err: any) {
      toast.error('Gönderilemedi: ' + err.message);
    } finally {
      setResettingEmail(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (uid: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.shopName.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Yönetici Paneli</h1>
            <p className="text-xs text-muted-foreground">{ADMIN_EMAIL}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-amber-500/25"
          >
            <UserPlus className="w-4 h-4" />
            Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Toplam Kullanıcı</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter((u) => u.storedPassword).length}
              </p>
              <p className="text-xs text-muted-foreground">Şifre Kayıtlı</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Yönetici</p>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="E-posta veya dükkan adı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* User list */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Kayıtlı Kullanıcılar
            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{filtered.length}</span>
          </h2>
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Sadece yönetici görebilir
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{search ? 'Kullanıcı bulunamadı' : 'Henüz kayıtlı kullanıcı yok'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((u) => (
              <div key={u.uid} className="p-5 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.email[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{u.email}</p>
                        <button
                          onClick={() => handleCopy(u.email, u.uid + '-email')}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="E-postayı kopyala"
                        >
                          {copiedId === u.uid + '-email' ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">{u.shopName}</p>
                      </div>
                      {u.createdAt > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}

                      {/* Stored password */}
                      {u.storedPassword ? (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                          <KeyRound className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-green-700 dark:text-green-400 font-medium">Şifre:</span>
                          <span className="text-xs font-mono font-semibold text-green-800 dark:text-green-300">
                            {visiblePasswords.has(u.uid) ? u.storedPassword : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(u.uid)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                          >
                            {visiblePasswords.has(u.uid) ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {visiblePasswords.has(u.uid) && (
                            <button
                              onClick={() => handleCopy(u.storedPassword!, u.uid + '-pass')}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Şifreyi kopyala"
                            >
                              {copiedId === u.uid + '-pass' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground italic">Şifre kayıtlı değil (Firebase Console'dan eklendi)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResetPassword(u.email)}
                      disabled={resettingEmail === u.email}
                      className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
                    >
                      {resettingEmail === u.email ? (
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      Şifre Sıfırla
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Yeni Kullanıcı Oluştur
              </h3>
              <button
                onClick={() => { setShowCreate(false); setCreateForm({ email: '', password: '', shopName: '' }); }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Yönetici panelinden oluşturulan kullanıcıların şifreleri kayıt edilir ve buradan gorulebilir.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Dükkan Adı</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={createForm.shopName}
                    onChange={(e) => setCreateForm({ ...createForm, shopName: e.target.value })}
                    placeholder="Market Adı"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="musteri@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showCreatePass ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="En az 6 karakter"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Oluştur
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateForm({ email: '', password: '', shopName: '' }); }}
                  className="px-5 py-3 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-semibold"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
