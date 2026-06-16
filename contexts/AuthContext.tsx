'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { auth, secondaryAuth, db } from '@/lib/firebase';
import { Settings } from '@/lib/types';

export const ADMIN_EMAIL = 'admin@yinreat.com';

interface UserRecord {
  uid: string;
  email: string;
  shopName: string;
  createdAt: number;
  storedPassword?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: Settings;
  isAdmin: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, shopName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  adminCreateUser: (email: string, password: string, shopName: string) => Promise<void>;
  adminGetAllUsers: () => Promise<UserRecord[]>;
  adminResetUserPassword: (email: string) => Promise<void>;
}

const defaultSettings: Settings = {
  shopName: 'Market Pro',
  logoUrl: '',
  taxRate: 18,
  currency: 'TRY',
  theme: 'light',
  lowStockThreshold: 10,
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          setSettings({ ...defaultSettings, ...snap.data().settings });
        }
      } else {
        setSettings(defaultSettings);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string, rememberMe = true) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, shopName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      shopName,
      createdAt: Date.now(),
      settings: { ...defaultSettings, shopName },
    });
    setSettings({ ...defaultSettings, shopName });
  };

  const logout = async () => {
    await signOut(auth);
    setSettings(defaultSettings);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user) return;
    const merged = { ...settings, ...newSettings };
    await setDoc(doc(db, 'users', user.uid), { settings: merged }, { merge: true });
    setSettings(merged);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  const deleteAccount = async (password: string) => {
    if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Delete all user data from Firestore
    const collections = ['products', 'sales', 'debts', 'categories'];
    for (const col of collections) {
      const snap = await getDocs(query(collection(db, col), where('userId', '==', user.uid)));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }
    await deleteDoc(doc(db, 'users', user.uid));

    // Delete Firebase Auth account
    await deleteUser(user);
    setSettings(defaultSettings);
  };

  const adminCreateUser = async (email: string, password: string, shopName: string) => {
    if (!isAdmin) throw new Error('Yetersiz yetki');
    // Use secondary auth instance so admin session is not disturbed
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      shopName,
      storedPassword: password,
      createdAt: Date.now(),
      settings: { ...defaultSettings, shopName },
    });
    await secondaryAuth.signOut();
  };

  const adminGetAllUsers = async (): Promise<UserRecord[]> => {
    if (!isAdmin) throw new Error('Yetersiz yetki');
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({
      uid: d.id,
      email: d.data().email || '',
      shopName: d.data().shopName || d.data().settings?.shopName || 'Bilinmiyor',
      createdAt: d.data().createdAt || 0,
      storedPassword: d.data().storedPassword,
    }));
  };

  const adminResetUserPassword = async (email: string) => {
    if (!isAdmin) throw new Error('Yetersiz yetki');
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        settings,
        isAdmin,
        signIn,
        register,
        logout,
        resetPassword,
        updateSettings,
        changePassword,
        deleteAccount,
        adminCreateUser,
        adminGetAllUsers,
        adminResetUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
