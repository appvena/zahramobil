"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBBQ-1BCsAZNSeIENSchcoOq4eiRhNtlCc",
  authDomain: "zahra-mobil.firebaseapp.com",
  projectId: "zahra-mobil",
  storageBucket: "zahra-mobil.firebasestorage.app",
  messagingSenderId: "1013699454212",
  appId: "1:1013699454212:web:bee678d2bd46e4c382dc51",
};

// Mencegah inisialisasi ganda (penting untuk Next.js)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
