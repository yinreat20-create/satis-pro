'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Menu,
  Search,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  Bell,
  Settings,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, settings, isAdmin } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/giris');
    } catch {
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  const email = user?.email || '';
  const initial = email[0]?.toUpperCase() || 'U';

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2 min-w-[200px] lg:min-w-[280px]">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Ürün, işlem, barkod ara..."
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={mounted && theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        >
          {mounted && theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted transition-colors"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${isAdmin ? 'bg-amber-500' : 'bg-blue-600'}`}>
              {isAdmin ? <Shield className="w-4 h-4" /> : initial}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-tight max-w-[120px] truncate">
                {isAdmin ? 'Yönetici' : settings.shopName}
              </p>
              <p className="text-xs text-muted-foreground leading-tight max-w-[120px] truncate">{email}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-2xl shadow-2xl shadow-black/10 p-1 z-50">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-xs font-semibold truncate">{email}</p>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-amber-600 font-medium">
                      <Shield className="w-3 h-3" /> Yönetici
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { router.push('/profil'); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profil Ayarları
                </button>

                <button
                  onClick={() => { router.push('/ayarlar'); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Dükkan Ayarları
                </button>

                {isAdmin && (
                  <button
                    onClick={() => { router.push('/yonetici'); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Yönetici Paneli
                  </button>
                )}

                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
