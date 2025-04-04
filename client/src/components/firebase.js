// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBtB4hu_yNUqVnKRnXMhbRyuTHDkyqLT00",
  authDomain: "chatrm-5d020.firebaseapp.com",
  projectId: "chatrm-5d020",
  storageBucket: "chatrm-5d020.appspot.com",
  messagingSenderId: "429043660265",
  appId: "1:429043660265:web:1897f48204866d5a678778",
  measurementId: "G-EPP34STNW9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);