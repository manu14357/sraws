import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyD3CL4Z-baSWV8aYwcLbCVuMfFpHiPqrE4",
  authDomain: "smartdoc-fd636.firebaseapp.com",
  projectId: "smartdoc-fd636",
  storageBucket: "smartdoc-fd636.appspot.com",
  messagingSenderId: "838582007891",
  appId: "1:838582007891:web:7e8f311d8f6735cfcaaea6",
  measurementId: "G-9SVP27RYSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { app, messaging, firebaseConfig };