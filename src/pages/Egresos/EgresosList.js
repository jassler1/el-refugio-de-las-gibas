import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import './EgresosList.css';

function EgresosList() {
  const [egresos, setEgresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [soloHoy, setSoloHoy] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState(''); // <-- filtro tipo agregado

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(100);

  // Para editar
  const [editEgreso, setEditEgreso] = useState(null);

  useEffect(() => {
    const egresosQuery = query(collection(db, 'egresos'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      egresosQuery,
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEgresos(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error al cargar egresos:', err);
        setError('Error al cargar registros: ' + err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filtrarEgresos = () => {
    return egresos.filter((egreso) => {
      const nombreValido = egreso.quienPago
        ? egreso.quienPago.toLowerCase().includes(searchName.toLowerCase())
        : false;

      // Filtro por tipo
      const tipoValido = tipoFiltro ? egreso.tipo === tipoFiltro : true;

      if (soloHoy) {
        if (!egreso.timestamp) return false;
        const fecha = egreso.timestamp.toDate();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mañana = new Date(hoy);
        mañana.setDate(hoy.getDate() + 1);
        return nombreValido && tipoValido && fecha >= hoy && fecha < mañana;
      }

      if (!startDate && !endDate) {
        return nombreValido && tipoValido;
      }

      if (!egreso.timestamp) return false;

      const fecha = egreso.timestamp.toDate();
      const inicio = startDate ? new Date(startDate) : null;
      const fin = endDate ? new Date(endDate) : null;
      if (fin) fin.setHours(23, 59, 59, 999);

      let dentro = true;
      if (inicio && fin) {
        dentro = fecha >= inicio && fecha <= fin;
      } else if (inicio) {
        dentro = fecha >= inicio;
      } else if (fin) {
        dentro = fecha <= fin;
      }

      return nombreValido && tipoValido && dentro;
    });
  };

  const handleEliminar = async (id) => {
    const confirm = window.confirm('¿Estás seguro de eliminar este egreso?');
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, 'egresos', id));
      alert('Egreso eliminado.');
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('No se pudo eliminar.');
    }
  };

  const handleGuardarCambios = async () => {
    if (!editEgreso?.id) return;
    try {
      await updateDoc(doc(db, 'egresos', editEgreso.id), {
        tipo: editEgreso.tipo,
        descripcion: editEgreso.descripcion || '',
        nombreServicio: editEgreso.nombreServicio || '',
        numeroFactura: editEgreso.numeroFactura || '',
        total: parseFloat(editEgreso.total) || 0,
        quienPago: editEgreso.quienPago || '',
      });
      alert('Egreso actualizado.');
      setEditEgreso(null);
    } catch (err) {
      console.error('Error al actualizar:', err);
      alert('No se pudo guardar cambios.');
    }
  };

  const egresosFiltrados = filtrarEgresos();
  const totalGastos = egresosFiltrados.reduce((sum, e) => sum + (e.total || 0), 0);

  // Paginación: índice de inicio y fin
  const inicio = (paginaActual - 1) * elementosPorPagina;
  const fin = inicio + elementosPorPagina;
  const egresosPagina = egresosFiltrados.slice(inicio, fin);

  if (loading) return <div className="loading-message">Cargando registros...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="egresos-list-container">
      <h3>Historial de Egresos</h3>

      <div className="controls-top">
        <div className="filters">
          <input
            type="text"
            placeholder="Buscar por quien pagó"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={soloHoy}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={soloHoy}
          />
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="producto">Producto</option>
            <option value="servicio">Servicio</option>
          </select>
        </div>
        <div className="option-hoy">
          <label>
            <input
              type="checkbox"
              checked={soloHoy}
              onChange={(e) => setSoloHoy(e.target.checked)}
            />
            Mostrar solo hoy
          </label>
        </div>
      </div>

      <p className="total-summary">Total de Gastos: Bs. {totalGastos.toFixed(2)}</p>

      <table className="egresos-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Descripción / Servicio</th>
            <th>Factura N°</th>
            <th>Total (Bs.)</th>
            <th>Pagado Por</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {egresosPagina.map((egreso) => (
            <tr key={egreso.id}>
              <td>{egreso.timestamp?.toDate().toLocaleDateString()}</td>
              <td>{egreso.tipo}</td>
              <td>
                {egreso.tipo === 'producto' ? egreso.descripcion : egreso.nombreServicio}
              </td>
              <td>{egreso.numeroFactura || 'N/A'}</td>
              <td>Bs. {egreso.total?.toFixed(2)}</td>
              <td>{egreso.quienPago}</td>
              <td>
                <button onClick={() => setEditEgreso(egreso)}>✏️</button>
                <button onClick={() => handleEliminar(egreso.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="paginacion">
        <button
          onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
          disabled={paginaActual === 1}
        >
          « Anterior
        </button>
        <span>Página {paginaActual}</span>
        <button
          onClick={() => setPaginaActual((p) => p + 1)}
          disabled={fin >= egresosFiltrados.length}
        >
          Siguiente »
        </button>
        <select
          value={elementosPorPagina}
          onChange={(e) => {
            setElementosPorPagina(Number(e.target.value));
            setPaginaActual(1);
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={500}>500</option>
        </select>
      </div>

      {editEgreso && (
        <div className="modal-backdrop">
          <div className="modal-edit">
            <h4>Editar Egreso</h4>
            <label>Tipo:</label>
            <select
              value={editEgreso.tipo}
              onChange={(e) => setEditEgreso({ ...editEgreso, tipo: e.target.value })}
            >
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </select>

            <label>Descripción / Servicio:</label>
            <input
              type="text"
              value={
                editEgreso.tipo === 'producto'
                  ? editEgreso.descripcion
                  : editEgreso.nombreServicio
              }
              onChange={(e) => {
                const val = e.target.value;
                setEditEgreso((prev) =>
                  prev.tipo === 'producto'
                    ? { ...prev, descripcion: val }
                    : { ...prev, nombreServicio: val }
                );
              }}
            />

            <label>Factura N°:</label>
            <input
              type="text"
              value={editEgreso.numeroFactura || ''}
              onChange={(e) => setEditEgreso({ ...editEgreso, numeroFactura: e.target.value })}
            />

            <label>Total (Bs.):</label>
            <input
              type="number"
              value={editEgreso.total}
              onChange={(e) => setEditEgreso({ ...editEgreso, total: e.target.value })}
            />

            <label>Pagado Por:</label>
            <input
              type="text"
              value={editEgreso.quienPago}
              onChange={(e) => setEditEgreso({ ...editEgreso, quienPago: e.target.value })}
            />

            <div className="modal-buttons">
              <button onClick={handleGuardarCambios}>💾 Guardar</button>
              <button onClick={() => setEditEgreso(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EgresosList;