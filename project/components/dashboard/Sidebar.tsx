'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  ShoppingBag,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/panel', label: 'Panel', icon: LayoutDashboard },
  { href: '/satis', label: 'Satış (POS)', icon: ShoppingCart },
  { href: '/urunler', label: 'Ürünler', icon: Package },
  { href: '/borc', label: 'Borçlar', icon: CreditCard },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { settings, isAdmin } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out',
          'w-[var(--sidebar-width)] glass-sidebar border-r border-border',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">{settings.shopName}</p>
              <p className="text-xs text-muted-foreground">SatisPro</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ana Menü
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              <p className="px-3 py-2 mt-3 text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Yönetim
              </p>
              <Link
                href="/yonetici"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  pathname === '/yonetici'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                    : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                )}
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                Yönetici Paneli
              </Link>
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">v1.0.0 · SatisPro</p>
        </div>
      </aside>
    </>
  );
}
