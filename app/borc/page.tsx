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
  doc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { Debt } from '@/lib/types';
import {
  CreditCard,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
}

export default function BorcPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paid'>('active');

  const loadDebts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'debts'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Debt));
      setDebts(data.sort((a, b) => b.createdAt - a.createdAt));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  const handlePayment = async () => {
    if (!paymentDialog || !user) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast.error('Geçerli bir miktar giriniz'); return; }
    if (amount > paymentDialog.remainingAmount) { toast.error('Ödeme tutarı kalan borçtan fazla olamaz'); return; }

    setSaving(true);
    try {
      const newPaidAmount = paymentDialog.paidAmount + amount;
      const newRemainingAmount = paymentDialog.remainingAmount - amount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : 'active';

      const payment = {
        amount,
        date: Date.now(),
        note: payNote.trim(),
      };

      await updateDoc(doc(db, 'debts', paymentDialog.id), {
        paidAmount: newPaidAmount,
        remainingAmount: Math.max(0, newRemainingAmount),
        status: newStatus,
        payments: arrayUnion(payment),
      });

      toast.success(newStatus === 'paid' ? 'Borç tamamen kapatıldı!' : `${formatCurrency(amount)} ödeme alındı`);
      setPaymentDialog(null);
      setPayAmount('');
      setPayNote('');
      await loadDebts();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = debts.filter((d) => {
    if (filter === 'active') return d.status === 'active';
    if (filter === 'paid') return d.status === 'paid';
    return true;
  });

  const totalActive = debts.filter((d) => d.status === 'active').reduce((s, d) => s + d.remainingAmount, 0);
  const totalPaid = debts.filter((d) => d.status === 'paid').reduce((s, d) => s + d.totalAmount, 0);

  const getDaysSince = (ts: number) => differenceInDays(new Date(), new Date(ts));

  return (
    <DashboardShell>
      {/* Payment dialog */}
      {paymentDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Ödeme Al</h3>
              <button onClick={() => setPaymentDialog(null)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Müşteri</span>
                <span className="font-semibold">{paymentDialog.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Toplam Borç</span>
                <span>{formatCurrency(paymentDialog.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ödenen</span>
                <span className="text-emerald-600">{formatCurrency(paymentDialog.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                <span>Kalan</span>
                <span className="text-red-500">{formatCurrency(paymentDialog.remainingAmount)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Ödeme Tutarı (₺)</label>
                <input
                  type="number"
                  min={0}
                  max={paymentDialog.remainingAmount}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`Maks: ${formatCurrency(paymentDialog.remainingAmount)}`}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Not (isteğe bağlı)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Ödeme notu..."
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setPaymentDialog(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">İptal</button>
                <button
                  onClick={handlePayment}
                  disabled={saving || !payAmount}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Ödemeyi Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="w-9 h-9 bg-red-100 dark:bg-red-950 rounded-xl flex items-center justify-center mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalActive)}</p>
          <p className="text-xs text-muted-foreground mt-1">Toplam Aktif Borç</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground mt-1">Kapatılan Toplam</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center mb-2">
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{debts.filter((d) => d.status === 'active').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Aktif Borçlu Müşteri</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : 'Kapatıldı'}
            <span className="ml-1.5 text-xs opacity-70">
              ({debts.filter((d) => f === 'all' ? true : d.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Debt list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CreditCard className="w-14 h-14 mb-3 opacity-20" />
          <p className="font-semibold text-lg">Borç kaydı bulunamadı</p>
          <p className="text-sm">Satış sırasında borç ödeme tipi seçerek kayıt oluşturabilirsiniz</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((debt) => {
            const daysSince = getDaysSince(debt.createdAt);
            const isOverdue = debt.status === 'active' && daysSince > 14;
            const progress = (debt.paidAmount / debt.totalAmount) * 100;
            const isExpanded = expandedId === debt.id;

            return (
              <div
                key={debt.id}
                className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${
                  isOverdue ? 'border-red-300 dark:border-red-800' : 'border-border'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      debt.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-950' :
                      isOverdue ? 'bg-red-100 dark:bg-red-950' : 'bg-amber-100 dark:bg-amber-950'
                    }`}>
                      {debt.status === 'paid' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <User className={`w-5 h-5 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{debt.customerName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(debt.createdAt, 'd MMM yyyy', { locale: tr })}
                            </span>
                            {isOverdue && (
                              <span className="text-xs bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                                {daysSince} gün gecikmeli
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {debt.status === 'paid' ? (
                            <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">Kapatıldı</span>
                          ) : (
                            <p className="text-base font-bold text-red-500">{formatCurrency(debt.remainingAmount)}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">Toplam: {formatCurrency(debt.totalAmount)}</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2.5">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${debt.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(0)}% ödendi</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : debt.id)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {debt.payments.length} ödeme geçmişi
                    </button>
                    {debt.status === 'active' && (
                      <button
                        onClick={() => setPaymentDialog(debt)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ödeme Al
                      </button>
                    )}
                  </div>
                </div>

                {/* Payment history */}
                {isExpanded && debt.payments.length > 0 && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ödeme Geçmişi</p>
                    {debt.payments.map((payment, i) => (
                      <div key={i} className="flex items-center justify-between bg-card rounded-xl p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs font-medium">{formatCurrency(payment.amount)}</p>
                            {payment.note && <p className="text-xs text-muted-foreground">{payment.note}</p>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(payment.date, 'd MMM yyyy HH:mm', { locale: tr })}</p>
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && debt.payments.length === 0 && (
                  <div className="border-t border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                    Henüz ödeme yapılmamış
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
