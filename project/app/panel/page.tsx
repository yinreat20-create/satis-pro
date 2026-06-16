'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { Sale, Product } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
}

export default function PanelPage() {
  const { user, settings } = useAuth();
  const [dailySales, setDailySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [dailyProfit, setDailyProfit] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Günaydın' : h < 18 ? 'İyi öğleden sonralar' : 'İyi akşamlar');
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = startOfDay(now).getTime();
      const todayEnd = endOfDay(now).getTime();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const salesRef = collection(db, 'sales');
      const baseQ = query(salesRef, where('userId', '==', user.uid));
      const allSnap = await getDocs(baseQ);
      const allSales = allSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));

      const todaySales = allSales.filter((s) => s.createdAt >= todayStart && s.createdAt <= todayEnd);
      const monthSales = allSales.filter((s) => s.createdAt >= monthStart);

      setDailySales(todaySales.reduce((a, s) => a + s.total, 0));
      setDailyProfit(todaySales.reduce((a, s) => a + s.profit, 0));
      setMonthlySales(monthSales.reduce((a, s) => a + s.total, 0));
      setRecentSales(allSales.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5));

      // 7-day chart
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        const ds = startOfDay(d).getTime();
        const de = endOfDay(d).getTime();
        const daySales = allSales.filter((s) => s.createdAt >= ds && s.createdAt <= de);
        return {
          gun: format(d, 'dd MMM', { locale: tr }),
          satis: daySales.reduce((a, s) => a + s.total, 0),
          kar: daySales.reduce((a, s) => a + s.profit, 0),
        };
      });
      setChartData(last7);

      // Payment type breakdown (this month)
      const payMap: Record<string, number> = { nakit: 0, kart: 0, borc: 0 };
      monthSales.forEach((s) => { payMap[s.paymentType] = (payMap[s.paymentType] || 0) + s.total; });
      setPaymentData([
        { name: 'Nakit', value: payMap.nakit },
        { name: 'Kart', value: payMap.kart },
        { name: 'Borç', value: payMap.borc },
      ].filter((p) => p.value > 0));

      // Top products
      const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      allSales.slice(-100).forEach((s) => {
        s.items.forEach((item) => {
          if (!prodMap[item.productId]) prodMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
          prodMap[item.productId].qty += item.quantity;
          prodMap[item.productId].revenue += item.total;
        });
      });
      const sorted = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setTopProducts(sorted);

      // Products
      const productsRef = collection(db, 'products');
      const prodQ = query(productsRef, where('userId', '==', user.uid));
      const prodSnap = await getDocs(prodQ);
      const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      setTotalProducts(products.length);
      const lowStock = products.filter((p) => p.stock === 0);
      setLowStockCount(lowStock.length);
      setLowStockItems(lowStock.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const statCards = [
    {
      label: 'Günlük Satış',
      value: formatCurrency(dailySales),
      sub: `Kâr: ${formatCurrency(dailyProfit)}`,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      trend: '+0%',
    },
    {
      label: 'Aylık Satış',
      value: formatCurrency(monthlySales),
      sub: 'Bu ay',
      icon: TrendingUp,
      color: 'bg-emerald-500',
      trend: '+0%',
    },
    {
      label: 'Toplam Ürün',
      value: totalProducts.toString(),
      sub: 'Aktif ürün',
      icon: Package,
      color: 'bg-violet-500',
      trend: '',
    },
    {
      label: 'Düşük Stok',
      value: lowStockCount.toString(),
      sub: 'Tükenen ürün',
      icon: AlertTriangle,
      color: 'bg-amber-500',
      trend: '',
    },
  ];

  return (
    <DashboardShell>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{greeting}, {settings.shopName}!</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-4 lg:p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`${s.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              {s.trend && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {s.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground leading-tight">{loading ? '...' : s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            <p className="text-xs text-muted-foreground/70">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-card rounded-2xl p-4 lg:p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Son 7 Gün Satış & Kâr</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">Canlı</span>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Yükleniyor...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="satisGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="karGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="gun" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number, name: string) => [formatCurrency(v), name === 'satis' ? 'Satış' : 'Kâr']}
                />
                <Area type="monotone" dataKey="satis" stroke="#2563eb" strokeWidth={2} fill="url(#satisGrad)" name="satis" />
                <Area type="monotone" dataKey="kar" stroke="#16a34a" strokeWidth={2} fill="url(#karGrad)" name="kar" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-2xl p-4 lg:p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Ödeme Tipleri (Ay)</h2>
          {loading || paymentData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Yükleniyor...' : 'Henüz veri yok'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {paymentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-card rounded-2xl p-4 lg:p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">En Çok Satan Ürünler</h2>
          {loading ? (
            <div className="text-muted-foreground text-sm">Yükleniyor...</div>
          ) : topProducts.length === 0 ? (
            <div className="text-muted-foreground text-sm">Henüz satış verisi yok</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} adet</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-card rounded-2xl p-4 lg:p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Düşük Stok Uyarıları
          </h2>
          {loading ? (
            <div className="text-muted-foreground text-sm">Yükleniyor...</div>
          ) : lowStockItems.length === 0 ? (
            <div className="text-muted-foreground text-sm">Düşük stok uyarısı yok</div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.category || 'Kategorisiz'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    p.stock === 0 ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                    p.stock <= 5 ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400' :
                    'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400'
                  }`}>
                    {p.stock} adet
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
