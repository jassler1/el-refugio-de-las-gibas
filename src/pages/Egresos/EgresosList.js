import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import './EgresosList.css';

function EgresosList({ userId }) {
  const [egresos, setEgresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setError('No hay usuario autenticado.');
      setLoading(false);
      return;
    }

    const egresosQuery = query(
      collection(db, 'egresos'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(egresosQuery, 
      (querySnapshot) => {
        const egresosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEgresos(egresosData);
        setLoading(false);
      },
      (err) => {
        console.error('Error al cargar los egresos:', err);
        setError('Error al cargar los registros: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Calcula el total de los gastos
  const totalGastos = egresos.reduce((sum, egreso) => sum + (egreso.total || 0), 0);

  if (loading) {
    return <div className="loading-message">Cargando registros...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="egresos-list-container">
      <h3>Historial de Egresos</h3>
      <p className="total-summary">Total de Gastos: Bs. {totalGastos.toFixed(2)}</p>
      {egresos.length > 0 ? (
        <table className="egresos-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción / Artículo</th>
              <th>Factura N°</th>
              <th>Total (Bs.)</th>
              <th>Pagado Por</th>
            </tr>
          </thead>
          <tbody>
            {egresos.map((egreso) => (
              <tr key={egreso.id}>
                <td>{egreso.timestamp?.toDate().toLocaleDateString()}</td>
                <td>{egreso.tipo === 'producto' ? 'Producto' : 'Servicio'}</td>
                <td>{egreso.tipo === 'producto' ? egreso.descripcion : egreso.nombreServicio}</td>
                <td>{egreso.numeroFactura || 'N/A'}</td>
                <td className="total-cell">Bs. {egreso.total?.toFixed(2)}</td>
                <td>{egreso.quienPago}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-list-message">No hay egresos registrados todavía.</p>
      )}
    </div>
  );
}

export default EgresosList;