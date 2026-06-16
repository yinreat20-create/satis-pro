'use client';

import { useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, Eye, EyeOff, Save, ShieldCheck, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilPage() {
  const { user, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [loading, setLoading] = useState(false);

  const email = user?.email || '';
  const initial = email[0]?.toUpperCase() || 'U';
  const createdAt = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !newPasswordRepeat) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    if (newPassword !== newPasswordRepeat) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalı');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('Yeni şifre mevcut şifreden farklı olmalı');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Şifre başarıyla güncellendi');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordRepeat('');
    } catch (err: any) {
      const msg =
        err.code === 'auth/wrong-password' ? 'Mevcut şifre hatalı' :
        err.code === 'auth/invalid-credential' ? 'Mevcut şifre hatalı' :
        err.code === 'auth/weak-password' ? 'Şifre çok zayıf' :
        err.message || 'Bir hata oluştu';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm';

  return (
    <DashboardShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Profil Ayarları</h1>
          <p className="text-sm text-muted-foreground">Hesap bilgileri ve güvenlik</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Account card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <User className="w-4 h-4" />
            Hesap Bilgileri
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg shadow-blue-500/25">
              {initial}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{email}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Hesap oluşturma: {createdAt}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-5 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <Lock className="w-4 h-4" />
            Şifre Değiştir
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Mevcut Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut şifreniz"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Yeni Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Yeni Şifre (Tekrar)</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showRepeat ? 'text' : 'password'}
                  value={newPasswordRepeat}
                  onChange={(e) => setNewPasswordRepeat(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar girin"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowRepeat(!showRepeat)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showRepeat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && newPasswordRepeat && newPassword !== newPasswordRepeat && (
                <p className="text-xs text-destructive mt-1">Şifreler eşleşmiyor</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/25 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Şifreyi Güncelle
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
