// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyDm9d_Y-GN2CSWdLKPfTkn71jEU7zIQpn0",
  authDomain: "el-refugio-de-las-gibas.firebaseapp.com",
  projectId: "el-refugio-de-las-gibas",
  storageBucket: "el-refugio-de-las-gibas.appspot.com",
  messagingSenderId: "85560888681",
  appId: "1:85560888681:web:406bfd808457fe246ec1f8",
  measurementId: "G-ZTVFTF7S8N"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;