import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import './Clientes.css';

import ClientesList from './ClientesList';
import ClientesAdd from './ClientesAdd';

const VIEWS = {
  LIST: 'list',
  ADD: 'add',
};

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [totalGastado, setTotalGastado] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState(VIEWS.LIST);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [clientesLoaded, setClientesLoaded] = useState(false);
  const [ventasLoaded, setVentasLoaded] = useState(false);

  useEffect(() => {
    const clientesQuery = query(collection(db, 'clientes'));
    const unsubscribeClientes = onSnapshot(
      clientesQuery,
      (querySnapshot) => {
        const listaClientes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClientes(listaClientes);
        setClientesLoaded(true);
      },
      (err) => {
        console.error('Error al cargar clientes:', err);
        setError(`Error al cargar los clientes: ${err.message}.`);
        setLoading(false);
      }
    );

    const ventasQuery = query(collection(db, 'ventas'));
    const unsubscribeVentas = onSnapshot(
      ventasQuery,
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
        console.error('Error al cargar ventas:', err);
        setError(`Error al cargar los datos de ventas: ${err.message}.`);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeClientes();
      unsubscribeVentas();
    };
  }, []);

  useEffect(() => {
    if (clientesLoaded && ventasLoaded) {
      setLoading(false);
    }
  }, [clientesLoaded, ventasLoaded]);

  const handleTopConsumidores = () => {
    const clientesConGasto = clientes.map(c => ({
      ...c,
      gastoTotal: totalGastado[c.id] || 0
    }));
    
    clientesConGasto.sort((a, b) => b.gastoTotal - a.gastoTotal);
    const top5 = clientesConGasto.slice(0, 5);
    alert(
      'Top 5 Consumidores:\n' +
        top5.map(c => `${c.nombreCompleto}: Bs. ${c.gastoTotal.toFixed(2)}`).join('\n')
    );
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
          onClienteAdded={() => setCurrentView(VIEWS.LIST)}
          onCancel={() => setCurrentView(VIEWS.LIST)}
        />
      )}
    </div>
  );
}

export default Clientes;