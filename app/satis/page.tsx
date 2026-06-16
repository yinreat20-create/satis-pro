'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { Product, CartItem, SaleItem } from '@/lib/types';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Tag,
  Banknote,
  CreditCard,
  AlertCircle,
  Package,
  CheckCircle,
  X,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
}

type PaymentType = 'nakit' | 'kart' | 'borc';

export default function SatisPage() {
  const { user, settings } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>('nakit');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const loadProducts = useCallback(async () => {
    if (!user) return;
    setProductsLoading(true);
    try {
      const q = query(collection(db, 'products'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const prods = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      setProducts(prods);
      const cats = ['Tümü', ...Array.from(new Set(prods.map((p) => p.category || 'Diğer').filter(Boolean)))];
      setCategories(cats);
    } finally {
      setProductsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    let filtered = products.filter((p) => p.stock > 0);
    if (selectedCategory !== 'Tümü') {
      filtered = filtered.filter((p) => (p.category || 'Diğer') === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Bu ürün stokta yok');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.warning(`Maksimum stok: ${product.stock} adet`);
          return prev;
        }
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty > c.product.stock) {
            toast.warning(`Maksimum stok: ${c.product.stock} adet`);
            return c;
          }
          return { ...c, quantity: Math.max(0, newQty) };
        })
        .filter((c) => c.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setPaymentType('nakit');
  };

  const subtotal = cart.reduce((sum, c) => sum + c.product.sellPrice * c.quantity, 0);
  const discountAmount = Math.min(discount, subtotal);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (settings.taxRate / 100) * taxableAmount;
  const total = taxableAmount + taxAmount;
  const profit = cart.reduce((sum, c) => sum + (c.product.sellPrice - c.product.buyPrice) * c.quantity, 0) - discountAmount;

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('Sepet boş! Ürün ekleyin.');
      return;
    }
    if (paymentType === 'borc' && !customerName.trim()) {
      toast.error('Borç satışı için müşteri adı gereklidir');
      return;
    }
    if (!user) {
      toast.error('Oturum açmanız gerekiyor');
      return;
    }

    setLoading(true);
    try {
      const now = Date.now();
      const saleItems: SaleItem[] = cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        buyPrice: c.product.buyPrice,
        sellPrice: c.product.sellPrice,
        total: c.product.sellPrice * c.quantity,
      }));

      const saleData = {
        userId: user.uid,
        items: saleItems,
        subtotal,
        discount: discountAmount,
        taxRate: settings.taxRate,
        taxAmount,
        total,
        profit,
        paymentType,
        customerName: paymentType === 'borc' ? customerName.trim() : '',
        createdAt: now,
        date: format(new Date(now), 'yyyy-MM-dd'),
      };

      const saleRef = await addDoc(collection(db, 'sales'), saleData);

      // Update stock for each product
      await Promise.all(
        cart.map((c) =>
          updateDoc(doc(db, 'products', c.product.id), {
            stock: increment(-c.quantity),
          })
        )
      );

      // Create debt record if payment type is borc
      if (paymentType === 'borc') {
        await addDoc(collection(db, 'debts'), {
          userId: user.uid,
          customerName: customerName.trim(),
          totalAmount: total,
          paidAmount: 0,
          remainingAmount: total,
          saleId: saleRef.id,
          createdAt: now,
          payments: [],
          status: 'active',
        });
      }

      // Update local products stock
      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = cart.find((c) => c.product.id === p.id);
          if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
          return p;
        })
      );

      setLastSale({ ...saleData, id: saleRef.id });
      setShowReceipt(true);
      clearCart();
      toast.success('Satış başarıyla tamamlandı!');
    } catch (err: any) {
      console.error('Sale error:', err);
      toast.error('Satış kaydedilemedi: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <h3 className="font-bold text-foreground">Satış Tamamlandı</h3>
              </div>
              <button onClick={() => setShowReceipt(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border border-dashed border-border rounded-2xl p-4 space-y-2 mb-4 bg-muted/30">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{settings.shopName}</span>
                <span>{format(lastSale.createdAt, 'dd.MM.yyyy HH:mm')}</span>
              </div>
              <div className="border-t border-dashed border-border pt-2 space-y-1">
                {lastSale.items.map((item: SaleItem, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.productName} x{item.quantity}</span>
                    <span>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-border pt-2 space-y-1">
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>İndirim</span>
                    <span>-{formatCurrency(lastSale.discount)}</span>
                  </div>
                )}
                {lastSale.taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>KDV ({lastSale.taxRate}%)</span>
                    <span>{formatCurrency(lastSale.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Toplam</span>
                  <span>{formatCurrency(lastSale.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ödeme</span>
                  <span className="capitalize">{lastSale.paymentType}</span>
                </div>
                {lastSale.customerName && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Müşteri</span>
                    <span>{lastSale.customerName}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowReceipt(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
        {/* Product grid */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Search & filter bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Barkod veya ürün adı ara..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === c
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Products */}
          <div className="flex-1 overflow-auto">
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-44 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium">Ürün bulunamadı</p>
                <p className="text-sm">Farklı bir arama deneyin veya ürün ekleyin</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-card border border-border rounded-2xl p-3 text-left hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 group relative overflow-hidden"
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-28 object-cover rounded-xl mb-2.5"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-28 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-2.5">
                        <Package className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.category || 'Diğer'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-blue-600">{formatCurrency(product.sellPrice)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        product.stock <= 5 ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                        product.stock <= 10 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400' :
                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}>
                        {product.stock}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    <div className="absolute top-2 right-2 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart panel */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm">Sepet</span>
              {cart.length > 0 && (
                <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.length}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Temizle
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-auto p-3 space-y-2 min-h-[160px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">Sepet boş</p>
                <p className="text-xs">Ürün eklemek için ürüne tıklayın</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-2.5 bg-muted/40 rounded-xl p-2.5">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight truncate">{item.product.name}</p>
                    <p className="text-xs text-blue-600 font-medium">{formatCurrency(item.product.sellPrice)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Summary & payment */}
          <div className="border-t border-border p-3 space-y-3">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="number"
                min={0}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="İndirim (₺)"
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Totals */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>İndirim</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>KDV (%{settings.taxRate})</span>
                <span>+{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                <span>Toplam</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment type */}
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { type: 'nakit', label: 'Nakit', icon: Banknote },
                { type: 'kart', label: 'Kart', icon: CreditCard },
                { type: 'borc', label: 'Borç', icon: AlertCircle },
              ] as const).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setPaymentType(type)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    paymentType === type
                      ? type === 'borc'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25'
                        : 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Customer name for debt */}
            {paymentType === 'borc' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Müşteri adı (zorunlu)"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-amber-300 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
            )}

            {/* Complete button */}
            <button
              onClick={completeSale}
              disabled={loading || cart.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Satışı Tamamla · {formatCurrency(total)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
