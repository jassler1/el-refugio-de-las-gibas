import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './Egresos.css';
import EgresosList from './EgresosList';

function Egresos({ userId }) {
  const [egresoProducto, setEgresoProducto] = useState({
    numeroFactura: '',
    quienPago: '',
    articulos: [],
  });
  
  const [articuloActual, setArticuloActual] = useState({
    descripcion: '',
    cantidad: '',
    total: '',
  });

  const [egresoServicio, setEgresoServicio] = useState({
    nombreServicio: '',
    total: '',
    quienPago: '',
    descripcion: '',
  });

  const [message, setMessage] = useState(null);

  const handleChangeProducto = (e) => {
    const { name, value } = e.target;
    setEgresoProducto((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleChangeArticulo = (e) => {
    const { name, value } = e.target;
    // Permite números y un punto decimal
    if (name === 'cantidad' || name === 'total') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setArticuloActual((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setArticuloActual((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleChangeServicio = (e) => {
    const { name, value } = e.target;
    setEgresoServicio((prev) => ({ ...prev, [name]: value }));
  };

  const handleAgregarArticulo = () => {
    // Validación más robusta
    if (!articuloActual.descripcion.trim() || !articuloActual.cantidad || !articuloActual.total) {
      setMessage({ text: 'Por favor, llena todos los campos del artículo antes de agregarlo.', type: 'error' });
      return;
    }
    
    // Convertir a número antes de agregar al array
    const nuevoArticulo = {
      descripcion: articuloActual.descripcion.trim(),
      cantidad: parseFloat(articuloActual.cantidad),
      total: parseFloat(articuloActual.total),
    };
    
    // Validar si los números son válidos
    if (isNaN(nuevoArticulo.cantidad) || isNaN(nuevoArticulo.total)) {
      setMessage({ text: 'La cantidad y el total deben ser números válidos.', type: 'error' });
      return;
    }

    setEgresoProducto((prev) => ({
      ...prev,
      articulos: [...prev.articulos, nuevoArticulo],
    }));
    
    // Resetea el formulario del artículo
    setArticuloActual({
      descripcion: '',
      cantidad: '',
      total: '',
    });
    setMessage(null); // Limpia el mensaje si se agrega correctamente
  };
  
  const handleEliminarArticulo = (index) => {
    const nuevosArticulos = egresoProducto.articulos.filter((_, i) => i !== index);
    setEgresoProducto((prev) => ({
      ...prev,
      articulos: nuevosArticulos,
    }));
  };

  const handleGuardarEgreso = async (tipo) => {
    if (!userId) {
      setMessage({ text: 'Error: No hay usuario autenticado.', type: 'error' });
      return;
    }

    let data;
    if (tipo === 'producto') {
      if (!egresoProducto.numeroFactura || !egresoProducto.quienPago || egresoProducto.articulos.length === 0) {
        setMessage({ text: 'Por favor, llena los campos de la factura y agrega al menos un artículo.', type: 'error' });
        return;
      }
      
      const totalFactura = egresoProducto.articulos.reduce((sum, articulo) => sum + articulo.total, 0);
      
      // 1. GENERAR DESCRIPCIÓN RESUMEN para la lista de Egresos
      const resumenDescripcion = egresoProducto.articulos
          .map(art => `${art.cantidad}x ${art.descripcion}`)
          .join(', ');
      // Limitar la longitud de la descripción para que no sea muy larga en la tabla
      const descripcionFinal = `Factura #${egresoProducto.numeroFactura} (${resumenDescripcion.substring(0, 150)}...)`;
      
      data = {
        ...egresoProducto,
        total: totalFactura,
        tipo: 'producto',
        descripcion: descripcionFinal, // 2. AÑADIR AL OBJETO DE DATOS
      };
      
    } else {
      if (!egresoServicio.total || !egresoServicio.quienPago || !egresoServicio.nombreServicio) {
        setMessage({ text: 'Por favor, llena los campos obligatorios para el egreso de servicio.', type: 'error' });
        return;
      }
      data = {
        ...egresoServicio,
        total: parseFloat(egresoServicio.total),
        tipo: 'servicio',
        // Asegurar que la descripción detallada (si existe) se mantenga
        descripcion: egresoServicio.descripcion || egresoServicio.nombreServicio, 
      };
    }

    try {
      await addDoc(collection(db, 'egresos'), {
        ...data,
        userId,
        timestamp: serverTimestamp(),
      });
      setMessage({ text: 'Egreso guardado exitosamente.', type: 'success' });
      
      if (tipo === 'producto') {
        setEgresoProducto({
          numeroFactura: '',
          quienPago: '',
          articulos: [],
        });
      } else {
        setEgresoServicio({
          nombreServicio: '',
          total: '',
          quienPago: '',
          descripcion: '',
        });
      }
    } catch (err) {
      console.error('Error al guardar el egreso:', err);
      setMessage({ text: 'Error al guardar el egreso. Inténtalo de nuevo.', type: 'error' });
    }
  };
  
  const calcularTotalArticulos = () => {
    return egresoProducto.articulos.reduce((sum, articulo) => sum + articulo.total, 0).toFixed(2);
  };

  return (
    <div className="egresos-container">
      {message && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Sección para Productos y Muebles */}
      <div className="form-section product-section">
        <h3>Registro de Factura de Productos</h3>
        <p className="subtitle">Registra múltiples artículos de una misma factura.</p>
        
        {/* Formulario de Factura (Campos generales) */}
        <div className="form-group-row">
            <div className="form-group">
                <label>Número de Factura/Recibo</label>
                <input
                  type="text"
                  name="numeroFactura"
                  value={egresoProducto.numeroFactura}
                  onChange={handleChangeProducto}
                  placeholder="Ej: 123456"
                />
            </div>
            <div className="form-group">
                <label>¿Quién Pagó? <span className="required">*</span></label>
                <input
                  type="text"
                  name="quienPago"
                  value={egresoProducto.quienPago}
                  onChange={handleChangeProducto}
                  placeholder="Ej: Juan Pérez"
                  required
                />
            </div>
        </div>
        
        {/* Formulario para añadir artículos */}
        <h4>Añadir Artículo</h4>
        <div className="form-group-add-item">
          <input
            type="text"
            name="descripcion"
            value={articuloActual.descripcion}
            onChange={handleChangeArticulo}
            placeholder="Descripción (ej: Coca Cola)"
          />
          <input
            type="number"
            name="cantidad"
            value={articuloActual.cantidad}
            onChange={handleChangeArticulo}
            placeholder="Cantidad"
            style={{ width: '80px' }}
          />
          <input
            type="number"
            name="total"
            value={articuloActual.total}
            onChange={handleChangeArticulo}
            placeholder="Total (Bs.)"
            style={{ width: '100px' }}
          />
          <button type="button" onClick={handleAgregarArticulo} className="btn-add-item">+</button>
        </div>

        {/* Lista de artículos agregados */}
        {egresoProducto.articulos.length > 0 && (
          <div className="item-list">
            <h4>Artículos en la Factura:</h4>
            <ul>
              {egresoProducto.articulos.map((articulo, index) => (
                <li key={index} className="list-item">
                  <span>{articulo.cantidad} x {articulo.descripcion} - Bs. {articulo.total.toFixed(2)}</span>
                  <button onClick={() => handleEliminarArticulo(index)} className="btn-remove-item">X</button>
                </li>
              ))}
            </ul>
            <p className="total-factura">Total de la Factura: **Bs. {calcularTotalArticulos()}**</p>
          </div>
        )}
        
        <button 
            type="button"
            onClick={() => handleGuardarEgreso('producto')} 
            className="btn-save"
            disabled={!egresoProducto.numeroFactura || !egresoProducto.quienPago || egresoProducto.articulos.length === 0}
        >
          Guardar Factura Completa
        </button>
      </div>

      {/* Sección para Servicios y Mantenimientos */}
      <div className="form-section service-section">
        <h3>Servicios y Mantenimientos</h3>
        <p className="subtitle">Pago por servicios como limpieza, mantenimiento, etc.</p>
        <form onSubmit={(e) => { e.preventDefault(); handleGuardarEgreso('servicio'); }}>
          <div className="form-group">
            <label>Nombre del Servicio <span className="required">*</span></label>
            <input
              type="text"
              name="nombreServicio"
              value={egresoServicio.nombreServicio}
              onChange={handleChangeServicio}
              placeholder="Ej: Servicio de limpieza mensual"
              required
            />
          </div>
          <div className="form-group-row">
            <div className="form-group">
              <label>Total (Bs.) <span className="required">*</span></label>
              <input
                type="number"
                name="total"
                value={egresoServicio.total}
                onChange={handleChangeServicio}
                placeholder="Ej: 500.00"
                required
              />
            </div>
            <div className="form-group">
              <label>¿Quién Pagó? <span className="required">*</span></label>
              <input
                type="text"
                name="quienPago"
                value={egresoServicio.quienPago}
                onChange={handleChangeServicio}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción (Opcional)</label>
            <input
              type="text"
              name="descripcion"
              value={egresoServicio.descripcion}
              onChange={handleChangeServicio}
              placeholder="Ej: Mantenimiento del sistema de aire"
            />
          </div>
          <button type="submit" className="btn-save">Guardar Egreso</button>
        </form>
      </div>
      
      <EgresosList userId={userId} />
    </div>
  );
}

export default Egresos;