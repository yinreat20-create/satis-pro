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
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { Product } from '@/lib/types';
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  X,
  Image,
  Filter,
  BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
}

const defaultForm = {
  name: '',
  barcode: '',
  category: '',
  stock: 0,
  buyPrice: 0,
  sellPrice: 0,
  imageUrl: '',
  description: '',
  lowStockAlert: 10,
};

export default function UrunlerPage() {
  const { user, settings } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tümü');
  const [categories, setCategories] = useState<string[]>(['Tümü']);
  const [showDialog, setShowDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const loadProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const prods = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      setProducts(prods.sort((a, b) => b.createdAt - a.createdAt));
      const cats = ['Tümü', ...Array.from(new Set(prods.map((p) => p.category || 'Diğer').filter(Boolean)))];
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openAdd = () => {
    setEditProduct(null);
    setFormData({
      ...defaultForm,
      lowStockAlert: settings.lowStockThreshold || 10,
    });
    setShowDialog(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setFormData({
      name: p.name,
      barcode: p.barcode || '',
      category: p.category || '',
      stock: p.stock,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      imageUrl: p.imageUrl || '',
      description: p.description || '',
      lowStockAlert: p.lowStockAlert || 10,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.name.trim()) { toast.error('Ürün adı gereklidir'); return; }
    if (formData.sellPrice <= 0) { toast.error('Satış fiyatı giriniz'); return; }

    setSaving(true);
    try {
      const data = {
        userId: user.uid,
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category.trim() || 'Diğer',
        stock: Number(formData.stock),
        buyPrice: Number(formData.buyPrice),
        sellPrice: Number(formData.sellPrice),
        imageUrl: formData.imageUrl.trim(),
        description: formData.description.trim(),
        lowStockAlert: Number(formData.lowStockAlert),
        createdAt: editProduct ? editProduct.createdAt : Date.now(),
        updatedAt: Date.now(),
      };

      if (editProduct) {
        await updateDoc(doc(db, 'products', editProduct.id), data);
        toast.success('Ürün güncellendi');
      } else {
        await addDoc(collection(db, 'products'), data);
        toast.success('Ürün eklendi');
      }
      setShowDialog(false);
      await loadProducts();
    } catch (err: any) {
      toast.error('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
      toast.success('Ürün silindi');
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    }
  };

  const filtered = products.filter((p) => {
    const matchCat = categoryFilter === 'Tümü' || (p.category || 'Diğer') === categoryFilter;
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    return matchCat && matchSearch;
  });

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

  return (
    <DashboardShell>
      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-border">
            <h3 className="font-bold text-lg mb-2">Ürünü Sil</h3>
            <p className="text-muted-foreground text-sm mb-6">Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">İptal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity">Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl border border-border max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">{editProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h3>
              <button onClick={() => setShowDialog(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Ürün Adı *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ürün adı" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Barkod</label>
                  <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Barkod numarası" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kategori</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Örn: İçecekler, Gıda..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Alış Fiyatı (₺)</label>
                  <input type="number" min={0} step="0.01" value={formData.buyPrice || ''} onChange={(e) => setFormData({ ...formData, buyPrice: Number(e.target.value) })} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Satış Fiyatı (₺) *</label>
                  <input type="number" min={0} step="0.01" value={formData.sellPrice || ''} onChange={(e) => setFormData({ ...formData, sellPrice: Number(e.target.value) })} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stok Miktarı</label>
                  <input type="number" min={0} value={formData.stock || ''} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Düşük Stok Uyarısı</label>
                  <input type="number" min={0} value={formData.lowStockAlert || ''} onChange={(e) => setFormData({ ...formData, lowStockAlert: Number(e.target.value) })} placeholder="10" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Görsel URL</label>
                  <input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://resim.com/urun.jpg" className={inputCls} />
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="Önizleme" className="mt-2 h-24 rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Açıklama</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ürün açıklaması..." rows={3} className={inputCls + ' resize-none'} />
                </div>
              </div>
              {formData.buyPrice > 0 && formData.sellPrice > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
                  Kâr marjı: {formatCurrency(formData.sellPrice - formData.buyPrice)} ({((formData.sellPrice - formData.buyPrice) / formData.buyPrice * 100).toFixed(1)}%)
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button onClick={() => setShowDialog(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">İptal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {editProduct ? 'Güncelle' : 'Ürün Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">Ürün Yönetimi</h1>
          <p className="text-sm text-muted-foreground">{products.length} ürün</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/25"
        >
          <Plus className="w-4 h-4" />
          Yeni Ürün Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün adı veya barkod ara..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="w-14 h-14 mb-3 opacity-20" />
          <p className="font-semibold text-lg">Ürün bulunamadı</p>
          <p className="text-sm">Yeni ürün eklemek için butona tıklayın</p>
          <button onClick={openAdd} className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Ürün Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((product) => (
            <div key={product.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-border/80 transition-all duration-200 group">
              <div className="relative">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-36 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(product)} className="w-7 h-7 bg-white dark:bg-card rounded-lg shadow flex items-center justify-center hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button onClick={() => setDeleteConfirm(product.id)} className="w-7 h-7 bg-white dark:bg-card rounded-lg shadow flex items-center justify-center hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
                <span className={`absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  product.stock === 0 ? 'bg-red-600 text-white' :
                  product.stock <= 5 ? 'bg-orange-500 text-white' :
                  product.stock <= 10 ? 'bg-yellow-500 text-white' :
                  'bg-emerald-500 text-white'
                }`}>
                  {product.stock === 0 ? 'Tükendi' : `${product.stock} adet`}
                </span>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.category || 'Diğer'}</p>
                {product.barcode && <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono truncate">{product.barcode}</p>}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Alış</p>
                    <p className="text-xs font-medium">{formatCurrency(product.buyPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Satış</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(product.sellPrice)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
