// App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { 
  auth, 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';

import Header from './components/Header';
import Inventario from './pages/Inventario/Inventario';
import PuntoVenta from './pages/PuntoVenta/PuntoVenta';
import Home from './pages/Home/Home.js';
import Clientes from './pages/Clientes/Clientes.js';
import Egresos from './pages/Egresos/Egresos';
import ReporteTotal from './pages/Reportes/ReporteTotal.js';
import GastosDiarios from './pages/GastosDiarios/GastosDiarios';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const navLinks = [
    { name: 'Inicio', url: '/' },
    { name: 'Inventario', url: '/inventario' },
    { name: 'Punto de Venta', url: '/punto-venta' },
    { name: 'Clientes', url: '/clientes' },
    { name: 'Egresos', url: '/egresos' },
    { name: 'Reporte', url: '/reporte' },
    { name: 'Gastos Diarios', url: '/gastos-diarios' },
  ];

  useEffect(() => {
    // Configura persistencia local para mantener la sesión anónima entre recargas
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
          if (authUser) {
            setUser(authUser);
            setIsLoading(false);
          } else {
            signInAnonymously(auth)
              .then((result) => {
                setUser(result.user);
                setIsLoading(false);
              })
              .catch((error) => {
                console.error('Error al iniciar sesión anónima:', error);
                setIsLoading(false);
              });
          }
        });

        // Cleanup
        return () => unsubscribe();
      })
      .catch((error) => {
        console.error('Error al configurar la persistencia:', error);
        setIsLoading(false);
      });
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
      <div className="app-container">
        <Header navLinks={navLinks} />
        <main className="content-area-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/inventario" element={<Inventario userId={user.uid} />} />
            <Route path="/punto-venta" element={<PuntoVenta userId={user.uid} />} />
            <Route path="/clientes" element={<Clientes userId={user.uid} />} />
            <Route path="/egresos" element={<Egresos userId={user.uid} />} />
            <Route path="/reporte" element={<ReporteTotal userId={user.uid} />} />
            <Route path="/gastos-diarios" element={<GastosDiarios userId={user.uid} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;