'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function GirisPage() {
  const { signIn, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'giris' | 'sifre'>('giris');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'giris') {
        await signIn(email, password, rememberMe);
        router.replace('/panel');
      } else {
        await resetPassword(email);
        toast.success('Şifre sıfırlama e-postası gönderildi');
        setMode('giris');
      }
    } catch (err: any) {
      const msg =
        err.code === 'auth/user-not-found' ? 'Kullanıcı bulunamadı' :
        err.code === 'auth/wrong-password' ? 'Hatalı şifre' :
        err.code === 'auth/invalid-credential' ? 'Geçersiz e-posta veya şifre' :
        err.code === 'auth/too-many-requests' ? 'Çok fazla deneme. Lütfen bekleyin' :
        err.message || 'Bir hata oluştu';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full bg-blue-300 blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">SatisPro</span>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            Modern Satış<br />Otomasyonu
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            Market, bakkal, telefoncu ve küçük işletmeler için tasarlanmış profesyonel satış yönetim sistemi.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: 'Gerçek Zamanlı', desc: 'Anlık stok ve satış takibi' },
              { label: 'POS Sistemi', desc: 'Hızlı barkodlu satış ekranı' },
              { label: 'Borç Takibi', desc: 'Müşteri borç yönetimi' },
              { label: 'Detaylı Rapor', desc: 'Kâr/zarar analizleri' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-blue-200 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-blue-200 text-sm">
          © 2025 SatisPro. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-card rounded-3xl shadow-2xl shadow-blue-100/50 dark:shadow-black/30 p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">SatisPro</span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {mode === 'giris' ? 'Hoş Geldiniz' : 'Şifre Sıfırla'}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {mode === 'giris'
                  ? 'Hesabınıza giriş yapın'
                  : 'E-postanıza sıfırlama bağlantısı göndereceğiz'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                    required
                  />
                </div>
              </div>

              {mode === 'giris' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Şifre
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'giris' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        rememberMe
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {rememberMe && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-foreground">Oturumu açık tut</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('sifre')}
                    className="text-xs text-primary hover:underline"
                  >
                    Şifremi unuttum
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'giris' ? 'Giriş Yap' : 'Sıfırlama Gönder'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'sifre' && (
              <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
                <button onClick={() => setMode('giris')} className="text-primary font-medium hover:underline">
                  Girişe geri dön
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
