import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyDCxXNBny3VIP5QRKQ2HOGYgyJqJFksDSs',
  authDomain: 'satispro-13ba1.firebaseapp.com',
  projectId: 'satispro-13ba1',
  storageBucket: 'satispro-13ba1.firebasestorage.app',
  messagingSenderId: '435152468711',
  appId: '1:435152468711:web:145900d3590791a780c042',
  measurementId: 'G-RJ824DP8KJ',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Secondary app instance used for admin user creation (avoids switching auth session)
const secondaryApp =
  getApps().find((a) => a.name === 'secondary') ??
  initializeApp(firebaseConfig, 'secondary');

export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(app);
export default app;
