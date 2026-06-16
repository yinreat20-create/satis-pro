'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Store,
  Percent,
  DollarSign,
  Sun,
  Moon,
  Bell,
  Save,
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Trash2,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AyarlarPage() {
  const { settings, updateSettings, user, resetPassword, deleteAccount } = useAuth();
  const { theme, setTheme, mounted } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState({
    shopName: settings.shopName,
    logoUrl: settings.logoUrl,
    taxRate: settings.taxRate,
    currency: settings.currency,
    lowStockThreshold: settings.lowStockThreshold,
  });
  const [saving, setSaving] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePass, setShowDeletePass] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset password state
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setForm({
      shopName: settings.shopName,
      logoUrl: settings.logoUrl,
      taxRate: settings.taxRate,
      currency: settings.currency,
      lowStockThreshold: settings.lowStockThreshold,
    });
  }, [settings]);

  const handleSave = async () => {
    if (!form.shopName.trim()) { toast.error('Dükkan adı boş olamaz'); return; }
    setSaving(true);
    try {
      await updateSettings({
        shopName: form.shopName.trim(),
        logoUrl: form.logoUrl.trim(),
        taxRate: Number(form.taxRate),
        currency: form.currency,
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      toast.success('Ayarlar kaydedildi');
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetting(true);
    try {
      await resetPassword(user.email);
      toast.success('Şifre sıfırlama e-postası gönderildi: ' + user.email);
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Şifrenizi girin');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      toast.success('Hesap ve tüm veriler silindi');
      router.replace('/giris');
    } catch (err: any) {
      const msg =
        err.code === 'auth/wrong-password' ? 'Şifre hatalı' :
        err.code === 'auth/invalid-credential' ? 'Şifre hatalı' :
        err.message || 'Bir hata oluştu';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Dükkan Ayarları</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/25 disabled:opacity-60"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </button>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Account info */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Hesap Bilgileri
          </h2>
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Hesap e-postası</p>
            </div>
          </div>
        </div>

        {/* Shop settings */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" />
            Dükkan Bilgileri
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Dükkan Adı</label>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                placeholder="Dükkan adınız"
                className={inputCls}
              />
              <p className="text-xs text-muted-foreground mt-1">Tüm sistem genelinde görünecek</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Logo URL (isteğe bağlı)</label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://resim.com/logo.png"
                className={inputCls}
              />
              {form.logoUrl && (
                <img
                  src={form.logoUrl}
                  alt="Logo önizleme"
                  className="mt-2 h-12 rounded-xl object-contain bg-muted/30 p-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Financial settings */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            Finansal Ayarlar
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">KDV Oranı (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Para Birimi</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputCls}
              >
                <option value="TRY">TRY - Türk Lirası (₺)</option>
                <option value="USD">USD - Amerikan Doları ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - İngiliz Sterlini (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stock settings */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            Stok Uyarıları
          </h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Düşük Stok Uyarı Eşiği</label>
            <input
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bu değerin altına düşen ürünler için uyarı gösterilir
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Sun className="w-4 h-4 text-blue-600" />
            Tema
          </h2>
          {!mounted ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border animate-pulse bg-muted/50">
                <Sun className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Açık Tema</p>
                  <p className="text-xs text-muted-foreground">Beyaz arka plan</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border animate-pulse bg-muted/50">
                <Moon className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Koyu Tema</p>
                  <p className="text-xs text-muted-foreground">Koyu arka plan</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  theme === 'light' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-border hover:border-primary/50'
                }`}
              >
                <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${theme === 'light' ? 'text-blue-600' : ''}`}>Açık Tema</p>
                  <p className="text-xs text-muted-foreground">Beyaz arka plan</p>
                </div>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark' ? 'border-blue-600 bg-blue-950' : 'border-border hover:border-primary/50'
                }`}
              >
                <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-400' : ''}`}>Koyu Tema</p>
                  <p className="text-xs text-muted-foreground">Koyu arka plan</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/25 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Ayarları Kaydet
        </button>

        {/* Security section */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Güvenlik
          </h2>

          {/* Reset password via email */}
          <div className="p-4 bg-muted/40 rounded-xl mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Şifre Sıfırla</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.email} adresine şifre sıfırlama bağlantısı gönderir
                </p>
              </div>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 flex-shrink-0"
              >
                {resetting ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Mail className="w-3 h-3" />
                )}
                E-posta Gönder
              </button>
            </div>
          </div>

          {/* Delete account */}
          <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Hesabı Sil</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Hesabınız, tüm ürünler, satışlar ve borç kayıtlarıyla birlikte kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 border border-destructive text-destructive hover:bg-destructive hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Hesabı Sil
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-destructive">Onaylamak için şifrenizi girin:</p>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showDeletePass ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Şifreniz"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-destructive/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePass(!showDeletePass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showDeletePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || !deletePassword}
                    className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {deleting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Kalıcı Olarak Sil
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeletePassword(''); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
