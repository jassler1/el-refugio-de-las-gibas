import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import './GastosDiariosList.css';

const PAGADORES = [
  'Caja',
  'Adriana Gomez',
  'Diego Vargas',
  'Jassler Rocha',
  'Marco Gomez',
  'Ninoska Pardo',
];

function GastosDiariosList() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros básicos
  const [searchName, setSearchName] = useState('');
  const [soloHoy, setSoloHoy] = useState(true);

  // Para nuevo gasto
  const [nuevoGasto, setNuevoGasto] = useState({
    fechaHora: new Date().toISOString().slice(0, 16),
    numeroFactura: '',
    productos: [{ nombre: '', precio: '', cantidad: '' }],
    pagadoPor: 'Caja',
  });

  // Para editar (puedes mejorar después)
  const [editGasto, setEditGasto] = useState(null);

  useEffect(() => {
    // Consulta con filtro para que timestamp exista
    const gastosQuery = query(
      collection(db, 'gastos_diarios'),
      where('timestamp', '!=', null),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      gastosQuery,
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGastos(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error al cargar gastos:', err);
        setError('Error al cargar registros: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrar gastos por productos y fecha si es solo hoy
  const filtrarGastos = () => {
    return gastos.filter((gasto) => {
      const descripcionConcat = gasto.productos
        ?.map((p) => p.nombre.toLowerCase())
        .join(' ') || '';

      const descripcionValida = descripcionConcat.includes(searchName.toLowerCase());

      if (soloHoy) {
        if (!gasto.timestamp) return false;
        const fecha = gasto.timestamp.toDate();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);
        return descripcionValida && fecha >= hoy && fecha < manana;
      }

      return descripcionValida;
    });
  };

  // Calcular total de productos de un gasto
  const calcularTotal = (productos) => {
    return productos.reduce((sum, p) => {
      const precio = parseFloat(p.precio) || 0;
      const cantidad = parseFloat(p.cantidad) || 0;
      return sum + precio * cantidad;
    }, 0);
  };

  // Manejo de productos en nuevo gasto
  const handleProductoChange = (index, field, value) => {
    const nuevosProductos = [...nuevoGasto.productos];
    nuevosProductos[index][field] = value;
    setNuevoGasto({ ...nuevoGasto, productos: nuevosProductos });
  };

  const agregarProducto = () => {
    setNuevoGasto({
      ...nuevoGasto,
      productos: [...nuevoGasto.productos, { nombre: '', precio: '', cantidad: '' }],
    });
  };

  const eliminarProducto = (index) => {
    if (nuevoGasto.productos.length === 1) return;
    const nuevosProductos = nuevoGasto.productos.filter((_, i) => i !== index);
    setNuevoGasto({ ...nuevoGasto, productos: nuevosProductos });
  };

  // Agregar gasto a Firestore
  const handleAgregarGasto = async () => {
    if (!nuevoGasto.numeroFactura.trim()) {
      alert('Ingrese el número de factura');
      return;
    }
    if (!nuevoGasto.pagadoPor) {
      alert('Seleccione quién pagó');
      return;
    }
    if (
      nuevoGasto.productos.some(
        (p) =>
          !p.nombre.trim() || !p.precio || isNaN(p.precio) || !p.cantidad || isNaN(p.cantidad)
      )
    ) {
      alert('Complete todos los campos de productos con valores válidos');
      return;
    }

    const total = calcularTotal(nuevoGasto.productos);

    try {
      await addDoc(collection(db, 'gastos_diarios'), {
        numeroFactura: nuevoGasto.numeroFactura.trim(),
        productos: nuevoGasto.productos.map((p) => ({
          nombre: p.nombre.trim(),
          precio: parseFloat(p.precio),
          cantidad: parseFloat(p.cantidad),
        })),
        total,
        pagadoPor: nuevoGasto.pagadoPor,
        timestamp: new Date(nuevoGasto.fechaHora),
        createdAt: serverTimestamp(),
      });
      // Reset formulario
      setNuevoGasto({
        fechaHora: new Date().toISOString().slice(0, 16),
        numeroFactura: '',
        productos: [{ nombre: '', precio: '', cantidad: '' }],
        pagadoPor: 'Caja',
      });
    } catch (err) {
      console.error('Error al agregar gasto:', err);
      alert('No se pudo agregar el gasto.');
    }
  };

  // Eliminar gasto
  const handleEliminar = async (id) => {
    const confirmar = window.confirm('¿Seguro que deseas eliminar este gasto?');
    if (!confirmar) return;
    try {
      await deleteDoc(doc(db, 'gastos_diarios', id));
      alert('Gasto eliminado');
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('No se pudo eliminar.');
    }
  };

  const gastosFiltrados = filtrarGastos();
  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + (g.total || 0), 0);

  if (loading) return <div className="loading-message">Cargando gastos diarios...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="gastos-list-container">
      <h3>Gastos Diarios</h3>

      <div className="controls-top">
        <input
          type="text"
          placeholder="Buscar productos"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={soloHoy}
            onChange={(e) => setSoloHoy(e.target.checked)}
          />
          Mostrar solo hoy
        </label>
      </div>

      <div className="nuevo-gasto">
        <label>Fecha y Hora:</label>
        <input
          type="datetime-local"
          value={nuevoGasto.fechaHora}
          onChange={(e) => setNuevoGasto({ ...nuevoGasto, fechaHora: e.target.value })}
        />

        <label>Número de Factura:</label>
        <input
          type="text"
          placeholder="Número de factura"
          value={nuevoGasto.numeroFactura}
          onChange={(e) => setNuevoGasto({ ...nuevoGasto, numeroFactura: e.target.value })}
        />

        <label>Productos:</label>
        {nuevoGasto.productos.map((producto, index) => (
          <div key={index} className="producto-row">
            <input
              type="text"
              placeholder="Nombre"
              value={producto.nombre}
              onChange={(e) => handleProductoChange(index, 'nombre', e.target.value)}
            />
            <input
              type="number"
              placeholder="Precio"
              min="0"
              step="0.01"
              value={producto.precio}
              onChange={(e) => handleProductoChange(index, 'precio', e.target.value)}
            />
            <input
              type="number"
              placeholder="Cantidad"
              min="0"
              step="1"
              value={producto.cantidad}
              onChange={(e) => handleProductoChange(index, 'cantidad', e.target.value)}
            />
            <button type="button" onClick={() => eliminarProducto(index)} title="Eliminar producto">
              🗑️
            </button>
          </div>
        ))}
        <button type="button" onClick={agregarProducto}>
          ➕ Añadir Producto
        </button>

        <label>Pagado por:</label>
        <select
          value={nuevoGasto.pagadoPor}
          onChange={(e) => setNuevoGasto({ ...nuevoGasto, pagadoPor: e.target.value })}
        >
          {PAGADORES.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        <p>
          <strong>Total calculado:</strong> Bs. {calcularTotal(nuevoGasto.productos).toFixed(2)}
        </p>

        <button onClick={handleAgregarGasto}>➕ Agregar Gasto</button>
      </div>

      <p className="total-summary">Total Gastos: Bs. {totalGastos.toFixed(2)}</p>

      <table className="gastos-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Factura</th>
            <th>Productos</th>
            <th>Total (Bs.)</th>
            <th>Pagado por</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gastosFiltrados.length === 0 && (
            <tr>
              <td colSpan="6" className="empty-list-message">
                No hay gastos para mostrar.
              </td>
            </tr>
          )}
          {gastosFiltrados.map((gasto) => (
            <tr key={gasto.id}>
              <td>{gasto.timestamp?.toDate().toLocaleString()}</td>
              <td>{gasto.numeroFactura}</td>
              <td>
                {gasto.productos?.map((p, i) => (
                  <div key={i}>
                    {p.nombre} - Bs. {p.precio} × {p.cantidad}
                  </div>
                ))}
              </td>
              <td>Bs. {gasto.total?.toFixed(2)}</td>
              <td>{gasto.pagadoPor}</td>
              <td>
                <button onClick={() => setEditGasto(gasto)}>✏️</button>
                <button onClick={() => handleEliminar(gasto.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal para editar (puedes mejorar después) */}
      {editGasto && (
        <div className="modal-backdrop">
          <div className="modal-edit">
            <h4>Editar Gasto</h4>

            <label>Descripción:</label>
            <input type="text" value={editGasto.descripcion || ''} readOnly />

            <label>Total (Bs.):</label>
            <input type="number" value={editGasto.total || 0} readOnly />

            <div className="modal-buttons">
              <button onClick={() => setEditGasto(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GastosDiariosList;