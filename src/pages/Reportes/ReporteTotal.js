import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import './ReporteTotal.css';

function ReporteTotal({ userId }) {
  const [ingresosTotales, setIngresosTotales] = useState(0);
  const [egresosTotales, setEgresosTotales] = useState(0);
  const [ventasList, setVentasList] = useState([]);
  const [egresosList, setEgresosList] = useState([]); // Nuevo estado para la lista de egresos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setError('No hay usuario autenticado.');
      setLoading(false);
      return;
    }

    // Consulta para los egresos
    const qEgresos = query(collection(db, 'egresos'), where('userId', '==', userId), orderBy('timestamp', 'desc'));

    // Consulta para las ventas (ingresos)
    const qVentas = query(
      collection(db, 'ventas'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    // Suscripción a la colección de Egresos
    const unsubscribeEgresos = onSnapshot(qEgresos, (querySnapshot) => {
      let total = 0;
      const egresosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        total += data.total || 0;
        return {
          id: doc.id,
          ...data,
          fecha: data.timestamp?.toDate().toLocaleDateString(),
          hora: data.timestamp?.toDate().toLocaleTimeString(),
        };
      });
      setEgresosTotales(total);
      setEgresosList(egresosData); // Se guarda la lista de egresos
      setLoading(false);
    }, (err) => {
      console.error("Error al cargar los egresos:", err);
      setError('Error al cargar los egresos: ' + err.message);
      setLoading(false);
    });

    // Suscripción a la colección de Ventas (Ingresos)
    const unsubscribeVentas = onSnapshot(qVentas, (querySnapshot) => {
      let totalVentas = 0;
      const ventasData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        totalVentas += data.total || 0;
        return {
          id: doc.id,
          ...data,
          fecha: data.timestamp?.toDate().toLocaleDateString(),
          hora: data.timestamp?.toDate().toLocaleTimeString(),
        };
      });
      setIngresosTotales(totalVentas);
      setVentasList(ventasData);
      setLoading(false);
    }, (err) => {
      console.error("Error al cargar las ventas:", err);
      setError('Error al cargar las ventas: ' + err.message);
      setLoading(false);
    });

    return () => {
      unsubscribeEgresos();
      unsubscribeVentas();
    };
  }, [userId]);

  const saldoTotal = ingresosTotales - egresosTotales;

  if (loading) {
    return <div className="loading-message">Cargando reporte...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="reporte-total-container">
      <h3>Reporte Total</h3>
      <div className="reporte-resumen">
        <div className="resumen-card ingresos-card">
          <h4>Total Ingresos</h4>
          <p className="valor ingresos-valor">Bs. {ingresosTotales.toFixed(2)}</p>
        </div>
        <div className="resumen-card egresos-card">
          <h4>Total Egresos</h4>
          <p className="valor egresos-valor">Bs. {egresosTotales.toFixed(2)}</p>
        </div>
        <div className="resumen-card saldo-card">
          <h4>Saldo Actual</h4>
          <p className={`valor saldo-valor ${saldoTotal >= 0 ? 'saldo-positivo' : 'saldo-negativo'}`}>
            Bs. {saldoTotal.toFixed(2)}
          </p>
        </div>
      </div>

      <hr className="divider" />

      <div className="lista-ventas-section">
        <h3>Detalle de Ventas</h3>
        {ventasList.length === 0 ? (
          <div className="no-data-message">
            No se encontraron ventas registradas.
          </div>
        ) : (
          <ul className="lista-ventas">
            {ventasList.map((venta) => (
              <li key={venta.id} className="venta-item">
                <div className="venta-header">
                  <span className="venta-info">
                    <strong>Fecha:</strong> {venta.fecha} a las {venta.hora}
                  </span>
                  <span className="venta-total">
                    Total: <strong>Bs. {venta.total?.toFixed(2) || '0.00'}</strong>
                  </span>
                </div>
                <ul className="articulos-vendidos">
                  {venta.articulos.map((articulo, index) => (
                    <li key={index} className="articulo-item">
                      <span>{articulo.cantidad} x {articulo.descripcion}</span>
                      <span className="articulo-precios">
                        Bs. {articulo.precioUnitario?.toFixed(2) || '0.00'} c/u - Subtotal: Bs. {(articulo.cantidad * articulo.precioUnitario)?.toFixed(2) || '0.00'}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <hr className="divider" />
      
      {/* Sección para la lista detallada de Egresos */}
      <div className="lista-egresos-section">
        <h3>Detalle de Egresos</h3>
        {egresosList.length === 0 ? (
          <div className="no-data-message">
            No se encontraron egresos registrados.
          </div>
        ) : (
          <ul className="lista-egresos">
            {egresosList.map((egreso) => (
              <li key={egreso.id} className="egreso-item">
                <div className="egreso-header">
                  <span className="egreso-info">
                    <strong>Fecha:</strong> {egreso.fecha} a las {egreso.hora}
                  </span>
                  <span className="egreso-total">
                    Total: <strong>Bs. {egreso.total?.toFixed(2) || '0.00'}</strong>
                  </span>
                </div>
                <p className="egreso-descripcion">
                  Descripción: {egreso.descripcion}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ReporteTotal;