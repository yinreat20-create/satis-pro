export interface Product {
  id: string;
  userId: string;
  name: string;
  barcode: string;
  category: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
  imageUrl: string;
  description: string;
  createdAt: number;
  lowStockAlert: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  userId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  profit: number;
  paymentType: 'nakit' | 'kart' | 'borc';
  customerName?: string;
  createdAt: number;
  date: string;
}

export interface Debt {
  id: string;
  userId: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  saleId: string;
  createdAt: number;
  payments: DebtPayment[];
  status: 'active' | 'paid';
}

export interface DebtPayment {
  amount: number;
  date: number;
  note: string;
}

export interface Settings {
  shopName: string;
  logoUrl: string;
  taxRate: number;
  currency: string;
  theme: 'light' | 'dark';
  lowStockThreshold: number;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
}
