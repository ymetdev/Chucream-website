import { getApps, initializeApp } from 'firebase/app';
import { 
  getFirestore
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHEYRKjgqqmXjae6HfcIrMyp4Bxuiu02Q",
  authDomain: "chucream-77c85.firebaseapp.com",
  projectId: "chucream-77c85",
  storageBucket: "chucream-77c85.firebasestorage.app",
  messagingSenderId: "572190251943",
  appId: "1:572190251943:web:3b715b7769d94312c0f482",
  measurementId: "G-VVT3F1Q0QB"
};

// Handle Vite HMR securely without crashing connections
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let dbInstance;
try {
  // Using standard getFirestore to avoid Safari IndexedDB crashes
  dbInstance = getFirestore(app);
} catch (e) {
  console.warn("Firestore initialization fallback", e);
  dbInstance = getFirestore(app);
}

import { getStorage } from 'firebase/storage';

export const db = dbInstance;
export const storage = getStorage(app);
