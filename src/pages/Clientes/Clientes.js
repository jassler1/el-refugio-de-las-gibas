import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import './Clientes.css';

import ClientesList from './ClientesList';
import ClientesAdd from './ClientesAdd';

const VIEWS = {
  LIST: 'list',
  ADD: 'add',
};

function Clientes({ userId }) {
  const [clientes, setClientes] = useState([]);
  const [totalGastado, setTotalGastado] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState(VIEWS.LIST);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [clientesLoaded, setClientesLoaded] = useState(false);
  const [ventasLoaded, setVentasLoaded] = useState(false);

  // Hook para obtener los clientes de Firebase
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const clientesQuery = query(collection(db, 'clientes'), where('userId', '==', userId));
    const unsubscribeClientes = onSnapshot(clientesQuery,
      (querySnapshot) => {
        const listaClientes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClientes(listaClientes);
        setClientesLoaded(true);
      },
      (err) => {
        console.error('Error in snapshot listener for clientes:', err);
        setError(`Error al cargar los clientes: ${err.message}. Revisa tus permisos de acceso.`);
        setLoading(false);
      }
    );

    const ventasQuery = query(collection(db, 'ventas'), where('userId', '==', userId));
    const unsubscribeVentas = onSnapshot(ventasQuery,
      (querySnapshot) => {
        const ventasPorCliente = {};
        querySnapshot.forEach(doc => {
          const ventaData = doc.data();
          const clienteId = ventaData.clienteId;
          const totalVenta = ventaData.total;

          if (clienteId && totalVenta) {
            ventasPorCliente[clienteId] = (ventasPorCliente[clienteId] || 0) + totalVenta;
          }
        });
        setTotalGastado(ventasPorCliente);
        setVentasLoaded(true);
      },
      (err) => {
        console.error('Error in snapshot listener for ventas:', err);
        setError(`Error al cargar los datos de ventas: ${err.message}.`);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeClientes();
      unsubscribeVentas();
    };
  }, [userId]);

  // Manejar el estado de carga combinado
  useEffect(() => {
    if (clientesLoaded && ventasLoaded) {
      setLoading(false);
    }
  }, [clientesLoaded, ventasLoaded]);

  const handleTopConsumidores = () => {
    // Implementa la lógica aquí usando el estado totalGastado
    const clientesConGasto = clientes.map(c => ({
      ...c,
      gastoTotal: totalGastado[c.id] || 0
    }));
    
    clientesConGasto.sort((a, b) => b.gastoTotal - a.gastoTotal);
    const top5 = clientesConGasto.slice(0, 5);
    alert('Top 5 Consumidores:\n' + top5.map(c => `${c.nombreCompleto}: Bs. ${c.gastoTotal.toFixed(2)}`).join('\n'));
  };

  if (loading) {
    return <div className="loading-message">Cargando clientes y ventas...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="page-container">
      <h2>Gestión de Clientes</h2>
      {currentView === VIEWS.LIST ? (
        <ClientesList
          clientes={clientes}
          totalGastado={totalGastado}
          filtroNombre={filtroNombre}
          setFiltroNombre={setFiltroNombre}
          handleTopConsumidores={handleTopConsumidores}
          setCurrentView={setCurrentView}
        />
      ) : (
        <ClientesAdd
          userId={userId}
          onClienteAdded={() => setCurrentView(VIEWS.LIST)}
          onCancel={() => setCurrentView(VIEWS.LIST)}
        />
      )}
    </div>
  );
}

export default Clientes;