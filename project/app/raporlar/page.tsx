'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Sale } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  BarChart2,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
}

type Period = 'today' | 'week' | 'month' | '3months' | 'year';

export default function RaporlarPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  const loadSales = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'sales'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));
      setSales(data.sort((a, b) => a.createdAt - b.createdAt));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const getPeriodRange = (): [number, number] => {
    const now = new Date();
    switch (period) {
      case 'today': return [startOfDay(now).getTime(), endOfDay(now).getTime()];
      case 'week': return [startOfWeek(now, { weekStartsOn: 1 }).getTime(), endOfWeek(now, { weekStartsOn: 1 }).getTime()];
      case 'month': return [startOfMonth(now).getTime(), endOfMonth(now).getTime()];
      case '3months': return [startOfMonth(subMonths(now, 2)).getTime(), endOfMonth(now).getTime()];
      case 'year': return [new Date(now.getFullYear(), 0, 1).getTime(), new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime()];
    }
  };

  const [rangeStart, rangeEnd] = getPeriodRange();
  const periodSales = sales.filter((s) => s.createdAt >= rangeStart && s.createdAt <= rangeEnd);

  const totalRevenue = periodSales.reduce((s, sale) => s + sale.total, 0);
  const totalProfit = periodSales.reduce((s, sale) => s + sale.profit, 0);
  const totalDiscount = periodSales.reduce((s, sale) => s + sale.discount, 0);
  const avgTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  // Chart data based on period
  const getChartData = () => {
    const now = new Date();
    if (period === 'today') {
      return Array.from({ length: 24 }, (_, h) => {
        const hourSales = periodSales.filter((s) => new Date(s.createdAt).getHours() === h);
        return {
          label: `${h}:00`,
          satis: hourSales.reduce((a, s) => a + s.total, 0),
          kar: hourSales.reduce((a, s) => a + s.profit, 0),
          adet: hourSales.length,
        };
      });
    }
    if (period === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(endOfWeek(now, { weekStartsOn: 1 }), 6 - i);
        const ds = startOfDay(d).getTime();
        const de = endOfDay(d).getTime();
        const daySales = periodSales.filter((s) => s.createdAt >= ds && s.createdAt <= de);
        return {
          label: format(d, 'EEE', { locale: tr }),
          satis: daySales.reduce((a, s) => a + s.total, 0),
          kar: daySales.reduce((a, s) => a + s.profit, 0),
          adet: daySales.length,
        };
      });
    }
    if (period === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
        const ds = startOfDay(d).getTime();
        const de = endOfDay(d).getTime();
        const daySales = periodSales.filter((s) => s.createdAt >= ds && s.createdAt <= de);
        return {
          label: `${i + 1}`,
          satis: daySales.reduce((a, s) => a + s.total, 0),
          kar: daySales.reduce((a, s) => a + s.profit, 0),
          adet: daySales.length,
        };
      });
    }
    if (period === '3months') {
      return Array.from({ length: 3 }, (_, i) => {
        const m = subMonths(now, 2 - i);
        const ms = startOfMonth(m).getTime();
        const me = endOfMonth(m).getTime();
        const mSales = periodSales.filter((s) => s.createdAt >= ms && s.createdAt <= me);
        return {
          label: format(m, 'MMM', { locale: tr }),
          satis: mSales.reduce((a, s) => a + s.total, 0),
          kar: mSales.reduce((a, s) => a + s.profit, 0),
          adet: mSales.length,
        };
      });
    }
    // year
    return Array.from({ length: 12 }, (_, i) => {
      const m = new Date(now.getFullYear(), i, 1);
      const ms = startOfMonth(m).getTime();
      const me = endOfMonth(m).getTime();
      const mSales = periodSales.filter((s) => s.createdAt >= ms && s.createdAt <= me);
      return {
        label: format(m, 'MMM', { locale: tr }),
        satis: mSales.reduce((a, s) => a + s.total, 0),
        kar: mSales.reduce((a, s) => a + s.profit, 0),
        adet: mSales.length,
      };
    });
  };

  const chartData = getChartData();

  // Payment breakdown
  const paymentBreakdown = [
    { name: 'Nakit', value: periodSales.filter((s) => s.paymentType === 'nakit').reduce((a, s) => a + s.total, 0) },
    { name: 'Kart', value: periodSales.filter((s) => s.paymentType === 'kart').reduce((a, s) => a + s.total, 0) },
    { name: 'Borç', value: periodSales.filter((s) => s.paymentType === 'borc').reduce((a, s) => a + s.total, 0) },
  ].filter((p) => p.value > 0);

  // Top products
  const prodMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
  periodSales.forEach((s) => {
    s.items.forEach((item) => {
      if (!prodMap[item.productId]) prodMap[item.productId] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
      prodMap[item.productId].qty += item.quantity;
      prodMap[item.productId].revenue += item.total;
      prodMap[item.productId].profit += (item.sellPrice - item.buyPrice) * item.quantity;
    });
  });
  const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const exportCSV = () => {
    const rows = [
      ['Tarih', 'Saat', 'Ürünler', 'Toplam', 'Kâr', 'Ödeme Tipi', 'Müşteri'],
      ...periodSales.map((s) => [
        format(s.createdAt, 'dd.MM.yyyy'),
        format(s.createdAt, 'HH:mm'),
        s.items.map((i) => `${i.productName} x${i.quantity}`).join('; '),
        s.total.toFixed(2),
        s.profit.toFixed(2),
        s.paymentType,
        s.customerName || '',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapor-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Bugün' },
    { key: 'week', label: 'Bu Hafta' },
    { key: 'month', label: 'Bu Ay' },
    { key: '3months', label: 'Son 3 Ay' },
    { key: 'year', label: 'Bu Yıl' },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold">Raporlar & Analiz</h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-card border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          CSV İndir
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
        {periods.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              period === key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Gelir', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'bg-blue-500' },
          { label: 'Net Kâr', value: formatCurrency(totalProfit), icon: TrendingUp, color: 'bg-emerald-500' },
          { label: 'Satış Adedi', value: periodSales.length.toString(), icon: ShoppingCart, color: 'bg-violet-500' },
          { label: 'Ortalama Sepet', value: formatCurrency(avgTicket), icon: BarChart2, color: 'bg-amber-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className={`${s.color} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-bold">{loading ? '...' : s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sales chart */}
      <div className="bg-card border border-border rounded-2xl p-4 lg:p-5 mb-6 shadow-sm">
        <h2 className="font-semibold mb-4">Satış & Kâr Grafiği</h2>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Yükleniyor...</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                formatter={(v: number, name: string) => [formatCurrency(v), name === 'satis' ? 'Satış' : 'Kâr']}
              />
              <Bar dataKey="satis" fill="#2563eb" radius={[4, 4, 0, 0]} name="satis" />
              <Bar dataKey="kar" fill="#16a34a" radius={[4, 4, 0, 0]} name="kar" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Payment breakdown */}
        <div className="bg-card border border-border rounded-2xl p-4 lg:p-5 shadow-sm">
          <h2 className="font-semibold mb-4">Ödeme Tipleri Dağılımı</h2>
          {loading || paymentBreakdown.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Yükleniyor...' : 'Veri yok'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary numbers */}
        <div className="bg-card border border-border rounded-2xl p-4 lg:p-5 shadow-sm">
          <h2 className="font-semibold mb-4">Özet</h2>
          <div className="space-y-3">
            {[
              { label: 'Toplam Satış Tutarı', value: formatCurrency(totalRevenue) },
              { label: 'Toplam Kâr', value: formatCurrency(totalProfit) },
              { label: 'Toplam İndirim', value: formatCurrency(totalDiscount) },
              { label: 'Kâr Marjı', value: totalRevenue > 0 ? `%${((totalProfit / totalRevenue) * 100).toFixed(1)}` : '%0' },
              { label: 'İşlem Sayısı', value: `${periodSales.length} adet` },
              { label: 'Ortalama Sepet Değeri', value: formatCurrency(avgTicket) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top products table */}
      <div className="bg-card border border-border rounded-2xl p-4 lg:p-5 shadow-sm">
        <h2 className="font-semibold mb-4">Ürün Bazlı Analiz</h2>
        {topProducts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Bu dönemde satış verisi yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Ürün</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-medium">Adet</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-medium">Gelir</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-medium">Kâr</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 text-sm text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 text-sm font-medium">{p.name}</td>
                    <td className="py-2.5 text-sm text-right">{p.qty}</td>
                    <td className="py-2.5 text-sm text-right font-medium">{formatCurrency(p.revenue)}</td>
                    <td className="py-2.5 text-sm text-right text-emerald-600">{formatCurrency(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
