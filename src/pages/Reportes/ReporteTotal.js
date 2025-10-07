import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import './ReporteTotal.css';

function ReporteTotal() {
  const [ingresosTotales, setIngresosTotales] = useState(0);
  const [egresosTotales, setEgresosTotales] = useState(0);
  const [gastosDiariosTotales, setGastosDiariosTotales] = useState(0);

  const [ventasList, setVentasList] = useState([]);
  const [egresosList, setEgresosList] = useState([]);
  const [gastosDiariosList, setGastosDiariosList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // 💰 Formateador de moneda en Bolivianos
  const formatBs = (valor) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2
    }).format(valor || 0);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const desdeTimestamp = fechaDesde ? Timestamp.fromDate(new Date(fechaDesde)) : null;
    const hastaTimestamp = fechaHasta
      ? Timestamp.fromDate(new Date(new Date(fechaHasta).setHours(23, 59, 59, 999)))
      : null;

    const buildQuery = (coleccion) => {
      let q = collection(db, coleccion);

      if (desdeTimestamp && hastaTimestamp) {
        q = query(
          q,
          where('timestamp', '>=', desdeTimestamp),
          where('timestamp', '<=', hastaTimestamp),
          orderBy('timestamp', 'asc')
        );
      } else if (desdeTimestamp) {
        q = query(q, where('timestamp', '>=', desdeTimestamp), orderBy('timestamp', 'asc'));
      } else if (hastaTimestamp) {
        q = query(q, where('timestamp', '<=', hastaTimestamp), orderBy('timestamp', 'asc'));
      } else {
        q = query(q, orderBy('timestamp', 'desc'));
      }

      return q;
    };

    const handleSnapshot = (querySnapshot, setList, setTotal) => {
      let total = 0;
      const data = querySnapshot.docs.map((doc) => {
        const d = doc.data();
        total += d.total || 0;
        return {
          id: doc.id,
          ...d,
          fecha: d.timestamp?.toDate().toLocaleDateString(),
          hora: d.timestamp?.toDate().toLocaleTimeString()
        };
      });
      if (fechaDesde || fechaHasta) {
        data.reverse();
      }
      setTotal(total);
      setList(data);
    };

    const unsubscribeEgresos = onSnapshot(
      buildQuery('egresos'),
      (snapshot) => {
        handleSnapshot(snapshot, setEgresosList, setEgresosTotales);
        setLoading(false);
      },
      (err) => {
        setError('Error al cargar los egresos: ' + err.message);
        setLoading(false);
      }
    );

    const unsubscribeVentas = onSnapshot(
      buildQuery('ventas'),
      (snapshot) => {
        handleSnapshot(snapshot, setVentasList, setIngresosTotales);
        setLoading(false);
      },
      (err) => {
        setError('Error al cargar las ventas: ' + err.message);
        setLoading(false);
      }
    );

    const unsubscribeGastosDiarios = onSnapshot(
      buildQuery('gastos_diarios'),
      (snapshot) => {
        handleSnapshot(snapshot, setGastosDiariosList, setGastosDiariosTotales);
        setLoading(false);
      },
      (err) => {
        setError('Error al cargar los gastos diarios: ' + err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeEgresos();
      unsubscribeVentas();
      unsubscribeGastosDiarios();
    };
  }, [fechaDesde, fechaHasta]);

  const inversionTotal = egresosTotales + gastosDiariosTotales;
  const gananciasBrutas = ingresosTotales - inversionTotal;
  const perdidas = gananciasBrutas < 0 ? Math.abs(gananciasBrutas) : 0;
  const saldoNeto = gananciasBrutas;

  return (
    <div className="reporte-total-container">
      <h3>Reporte Total de Ingresos y Egresos en Bolivianos (Bs)</h3>

      <div className="filtros-fecha">
        <label>
          Desde:{' '}
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </label>
        <label>
          Hasta:{' '}
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </label>
      </div>

      {loading && <div className="loading-message">Cargando reporte...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="reporte-resumen">
            <div className="resumen-card">
              <h4>Ventas Totales</h4>
              <p className="valor ingresos-valor">{formatBs(ingresosTotales)}</p>
            </div>

            <div className="resumen-card">
              <h4>Egresos Totales</h4>
              <p className="valor egresos-valor">{formatBs(egresosTotales)}</p>
            </div>

            <div className="resumen-card">
              <h4>Gastos Diarios Totales</h4>
              <p className="valor gastos-valor">{formatBs(gastosDiariosTotales)}</p>
            </div>

            <div className="resumen-card">
              <h4>Inversión Total (Egresos + Gastos)</h4>
              <p className="valor inversion-valor">{formatBs(inversionTotal)}</p>
            </div>

            <div className="resumen-card">
              <h4>Ganancias Brutas</h4>
              <p
                className={`valor ganancias-valor ${
                  gananciasBrutas >= 0 ? 'positivo' : 'negativo'
                }`}
              >
                {formatBs(gananciasBrutas)}
              </p>
            </div>

            <div className="resumen-card">
              <h4>Pérdidas</h4>
              <p className="valor perdidas-valor">{formatBs(perdidas)}</p>
            </div>

            <div className="resumen-card">
              <h4>Saldo Neto</h4>
              <p className={`valor neto-valor ${saldoNeto >= 0 ? 'positivo' : 'negativo'}`}>
                {formatBs(saldoNeto)}
              </p>
            </div>
          </div>

          {/* Lista de ingresos */}
          <section className="lista-ventas-section">
            <h3>Ingresos (Ventas)</h3>
            {ventasList.length === 0 ? (
              <p className="no-data-message">No hay ingresos en este rango de fechas.</p>
            ) : (
              <ul className="lista-ventas">
                {ventasList.map((venta) => (
                  <li key={venta.id} className="venta-item">
                    <div className="venta-header">
                      <div className="venta-info">
                        <strong>Fecha:</strong> {venta.fecha} <br />
                        <strong>Hora:</strong> {venta.hora}
                      </div>
                      <div className="venta-total">{formatBs(venta.total)}</div>
                    </div>
                    {venta.articulos && (
                      <ul className="articulos-vendidos">
                        {venta.articulos.map((art, idx) => (
                          <li key={idx} className="articulo-item">
                            <span>{art.nombre || art.descripcion || 'Artículo'}</span>
                            <span className="articulo-precios">
                              {art.cantidad ? `${art.cantidad}x ` : ''}
                              {formatBs(art.precio)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Lista de egresos */}
          <section className="lista-egresos-section">
            <h3>Egresos</h3>
            {egresosList.length === 0 ? (
              <p className="no-data-message">No hay egresos en este rango de fechas.</p>
            ) : (
              <ul className="lista-egresos">
                {egresosList.map((egreso) => (
                  <li key={egreso.id} className="egreso-item">
                    <div className="egreso-header">
                      <div className="egreso-info">
                        <strong>Fecha:</strong> {egreso.fecha} <br />
                        <strong>Hora:</strong> {egreso.hora}
                      </div>
                      <div className="egreso-total">{formatBs(egreso.total)}</div>
                    </div>
                    <p className="egreso-descripcion">{egreso.descripcion || 'Sin descripción'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Lista de gastos diarios */}
          <section className="lista-gastos-section">
            <h3>Gastos Diarios</h3>
            {gastosDiariosList.length === 0 ? (
              <p className="no-data-message">No hay gastos diarios en este rango de fechas.</p>
            ) : (
              <ul className="lista-gastos">
                {gastosDiariosList.map((gasto) => (
                  <li key={gasto.id} className="gasto-item">
                    <div className="gasto-header">
                      <div className="gasto-info">
                        <strong>Fecha:</strong> {gasto.fecha} <br />
                        <strong>Hora:</strong> {gasto.hora}
                      </div>
                      <div className="gasto-total">{formatBs(gasto.total)}</div>
                    </div>
                    <p className="gasto-descripcion">{gasto.descripcion || 'Sin descripción'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default ReporteTotal;