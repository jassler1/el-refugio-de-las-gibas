import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

import Sidebar from './components/Sidebar';
import Inventario from './pages/Inventario/Inventario';
import PuntoVenta from './pages/PuntoVenta/PuntoVenta';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const navLinks = [
    { name: 'Inventario', url: '/inventario' },
    { name: 'Punto de Venta', url: '/punto-venta' },
    { name: 'Kits', url: '/kits' },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error('Error al iniciar sesión anónima:', error);
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || !user) {
    return (
      <div className="loading-container">
        Cargando...
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container-sidebar-only">
        <Sidebar navLinks={navLinks} />
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Inventario userId={user.uid} />} />
            <Route path="/inventario" element={<Inventario userId={user.uid} />} />
            <Route path="/punto-venta" element={<PuntoVenta userId={user.uid} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;