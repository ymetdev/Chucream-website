import { collection, doc, getDoc, updateDoc, setDoc, addDoc, onSnapshot, query, orderBy, where, deleteDoc, runTransaction, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Product, Order, StoreConfig, UserTarget } from '../shared/types';

// Collection references
const productsCollection = collection(db, 'products');
const ordersCollection = collection(db, 'orders');
const reviewsCollection = collection(db, 'reviews');

// Real-time Listeners
export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  const q = query(productsCollection, where('isActive', '==', true));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(products);
  });
};

export const subscribeToAllProducts = (callback: (products: Product[]) => void) => {
  return onSnapshot(productsCollection, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(products);
  });
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  // Only get active orders (excluding completed ones older than today)
  const q = query(ordersCollection, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    callback(orders);
  });
};

export const subscribeToStoreConfig = (callback: (config: StoreConfig | null) => void) => {
  // Assuming a single document 'main' in 'config'
  const docRef = doc(db, 'config', 'main');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as StoreConfig);
    } else {
      callback(null);
    }
  });
}

export const subscribeToReviews = (callback: (reviews: any[]) => void) => {
  const q = query(reviewsCollection, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(reviews);
  });
}

export const subscribeToUsers = (callback: (users: UserTarget[]) => void) => {
  const usersCollection = collection(db, 'users');
  const q = query(usersCollection, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ phoneNumber: doc.id, ...doc.data() } as UserTarget));
    callback(users);
  });
};

// Basic Operations
export const toggleProductAvailability = async (productId: string, stockStatus: string, isActive?: boolean) => {
  const docRef = doc(db, 'products', productId);
  const data: any = { stockStatus };
  if (isActive !== undefined) data.isActive = isActive;
  await updateDoc(docRef, data);
};

export const getNextQueueNumber = async (): Promise<string> => {
  const dateStr = new Date().toISOString().split('T')[0];
  const counterRef = doc(db, 'counters', dateStr);

  const nextNum = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let count = 1;

    if (counterDoc.exists()) {
      count = (counterDoc.data().count || 0) + 1;
    }

    transaction.set(counterRef, { count });
    return count;
  });

  return `#${nextNum.toString().padStart(2, '0')}`;
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'queueNumber'>) => {
  const queueNumber = await getNextQueueNumber();
  const docRef = await addDoc(ordersCollection, { ...orderData, queueNumber });
  return { id: docRef.id, queueNumber };
};

export const createProduct = async (productData: Omit<Product, 'id'>) => {
  const docRef = await addDoc(productsCollection, { ...productData, createdAt: Date.now() });
  return docRef.id;
};

export const updateProduct = async (productId: string, data: Partial<Product>) => {
  const docRef = doc(db, 'products', productId);
  await updateDoc(docRef, data);
};

export const deleteProduct = async (productId: string) => {
  const docRef = doc(db, 'products', productId);
  await deleteDoc(docRef);
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, { status });
};

export const updateStoreConfig = async (configData: Partial<StoreConfig>) => {
  const docRef = doc(db, 'config', 'main');
  await setDoc(docRef, { ...configData, updatedAt: Date.now() }, { merge: true });
};

export const getUserByPhone = async (phoneNumber: string) => {
  const docRef = doc(db, 'users', phoneNumber);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { phoneNumber: snapshot.id, ...snapshot.data() } as UserTarget;
  }
  return null;
};

export const addLoyaltyPoints = async (phoneNumber: string, pointsToAdd: number, name?: string, nickname?: string, age?: number) => {
  const docRef = doc(db, 'users', phoneNumber);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const currentPoints = snapshot.data().points || 0;
    await updateDoc(docRef, { points: currentPoints + pointsToAdd });
  } else {
    await setDoc(docRef, { 
      points: pointsToAdd, 
      name: name || 'Customer',
      nickname: nickname || '',
      age: age || 0,
      createdAt: Date.now()
    });
  }
};

export const addReview = async (reviewData: Omit<any, 'id'>) => {
  const docRef = await addDoc(reviewsCollection, { ...reviewData, createdAt: Date.now() });
  return docRef.id;
};

export const deleteReview = async (id: string) => {
  const docRef = doc(db, 'reviews', id);
  await deleteDoc(docRef);
};

export const clearAllOrders = async () => {
  const snapshot = await getDocs(ordersCollection);
  const deletionPromises = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletionPromises);
};

export const clearAllCounters = async () => {
  const countersCollection = collection(db, 'counters');
  const snapshot = await getDocs(countersCollection);
  const deletionPromises = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletionPromises);
};
