export type StockStatus = 'available' | 'low_stock' | 'sold_out' | 'unavailable';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'voided';

export interface Product {
  id: string; // Firestore document ID
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stockStatus: StockStatus;
  isActive: boolean; // For toggle via Admin
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtPurchase: number; // Keep historical price
}

export interface Order {
  id: string;
  customerPhone?: string;
  customerName?: string;
  items: OrderItem[];
  totalPrice: number;
  pickupTime: string; // e.g. "14:30"
  status: OrderStatus;
  paymentMethod: 'promptpay' | 'cash';
  paymentStatus: 'pending' | 'paid';
  createdAt: number; // timestamp
}

export interface StoreConfig {
  id: string;
  locationName: string;
  boothNumber: string;
  mapUrl: string;
  promptpayNumber?: string;
  pointsPerBaht?: number;
  discountPointsCost?: number;
  discountValue?: number;
  freeSnackPointsCost?: number;
  freeSnackName?: string;
  updatedAt: number;
}

export interface UserTarget {
  phoneNumber: string; // Serving as ID
  points: number;
  name?: string;
}
