// firebase.js
import { initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB-AmXGzGbdLIWFSZLPg4olwZBrSY0ftcU",
  authDomain: "login-55144.firebaseapp.com",
  projectId: "login-55144",
  storageBucket: "login-55144.firebasestorage.app",
  messagingSenderId: "689631100596",
  appId: "1:689631100596:web:045d51e5805892f0d521e1"
};

// Inicializar Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.log('Firebase ya estaba inicializado');
  app = getApp(); // ¡Ahora sí está importado!
}

export const auth = getAuth(app);