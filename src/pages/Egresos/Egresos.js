import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './Egresos.css';
import EgresosList from './EgresosList';

function Egresos() {
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
    if (!articuloActual.descripcion.trim() || !articuloActual.cantidad || !articuloActual.total) {
      setMessage({ text: 'Por favor, llena todos los campos del artículo antes de agregarlo.', type: 'error' });
      return;
    }
    
    const nuevoArticulo = {
      descripcion: articuloActual.descripcion.trim(),
      cantidad: parseFloat(articuloActual.cantidad),
      total: parseFloat(articuloActual.total),
    };
    
    if (isNaN(nuevoArticulo.cantidad) || isNaN(nuevoArticulo.total)) {
      setMessage({ text: 'La cantidad y el total deben ser números válidos.', type: 'error' });
      return;
    }

    setEgresoProducto((prev) => ({
      ...prev,
      articulos: [...prev.articulos, nuevoArticulo],
    }));
    
    setArticuloActual({
      descripcion: '',
      cantidad: '',
      total: '',
    });
    setMessage(null);
  };
  
  const handleEliminarArticulo = (index) => {
    const nuevosArticulos = egresoProducto.articulos.filter((_, i) => i !== index);
    setEgresoProducto((prev) => ({
      ...prev,
      articulos: nuevosArticulos,
    }));
  };

  const handleGuardarEgreso = async (tipo) => {
    let data;
    if (tipo === 'producto') {
      if (!egresoProducto.numeroFactura || !egresoProducto.quienPago || egresoProducto.articulos.length === 0) {
        setMessage({ text: 'Por favor, llena los campos de la factura y agrega al menos un artículo.', type: 'error' });
        return;
      }
      
      const totalFactura = egresoProducto.articulos.reduce((sum, articulo) => sum + articulo.total, 0);

      const resumenDescripcion = egresoProducto.articulos
          .map(art => `${art.cantidad}x ${art.descripcion}`)
          .join(', ');

      const descripcionFinal = `Factura #${egresoProducto.numeroFactura} (${resumenDescripcion.substring(0, 150)}...)`;
      
      data = {
        ...egresoProducto,
        total: totalFactura,
        tipo: 'producto',
        descripcion: descripcionFinal,
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
        descripcion: egresoServicio.descripcion || egresoServicio.nombreServicio,
      };
    }

    try {
      await addDoc(collection(db, 'egresos'), {
        ...data,
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

      <div className="form-section product-section">
        <h3>Registro de Factura de Productos</h3>
        <p className="subtitle">Registra múltiples artículos de una misma factura.</p>
        
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
            <p className="total-factura">Total de la Factura: <strong>Bs. {calcularTotalArticulos()}</strong></p>
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
      
      <EgresosList />
    </div>
  );
}

export default Egresos;