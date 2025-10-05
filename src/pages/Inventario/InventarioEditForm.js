import React, { useState, useEffect, useRef } from 'react';
// IMPORTANTE: Asegúrate de tener un archivo InventarioEditForm.css con los estilos o usar los de InventarioForm.css

function InventarioEditForm({ insumo, onUpdate, onCancel }) {
  
  // Usamos un ref para el cálculo automático de CostoVenta, similar al InventarioForm original
  const precioVentaManualRef = useRef(false);

  // Inicialización del estado del formulario (SIN el campo 'cantidad')
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    unidadMedida: '',
    stockMinimo: '', // Cambiado a string para manejar inputs vacíos
    costoCompra: '', 
    ganancia: '', // Ganancia en porcentaje (ej: 25)
    costoVenta: '', // Precio de venta final
    proveedor: '',
    sinPrecioVenta: false,
  });

  // Lista de unidades de medida (asumiendo que es fija)
  const unidadesMedida = ['kg', 'gm', 'lts', 'unidad', 'mlts'];
  
  // Función auxiliar para normalizar categorías a mayúsculas
  const normalizeCategoryName = (name) => (name ? name.trim().toUpperCase() : '');

  // 1. Efecto para cargar y preformatear los datos del insumo (Edición)
  useEffect(() => {
    if (insumo) {
      setFormData({
        nombre: insumo.nombre || '',
        categoria: insumo.categoria || '',
        unidadMedida: insumo.unidadMedida || unidadesMedida[0],
        stockMinimo: insumo.stockMinimo?.toString() || '0',
        costoCompra: insumo.costoCompra?.toString() || '0',
        // Multiplicar ganancia por 100 para mostrar el porcentaje
        ganancia: insumo.ganancia ? (insumo.ganancia * 100).toString() : '0',
        costoVenta: insumo.costoVenta?.toString() || '0',
        proveedor: insumo.proveedor || '',
        sinPrecioVenta: insumo.sinPrecioVenta || false,
      });
      // Inicializar la referencia manual
      precioVentaManualRef.current = insumo.sinPrecioVenta ? false : !!insumo.costoVenta;
    }
  }, [insumo]);

  // 2. Efecto para recalcular CostoVenta automáticamente
  useEffect(() => {
    const costoCompraNum = parseFloat(formData.costoCompra);
    const gananciaNum = parseFloat(formData.ganancia);

    if (!formData.sinPrecioVenta && !precioVentaManualRef.current && !isNaN(costoCompraNum) && !isNaN(gananciaNum)) {
      setFormData((prev) => ({
        ...prev,
        costoVenta: (costoCompraNum * (1 + gananciaNum / 100)).toFixed(2),
      }));
    }
  }, [formData.costoCompra, formData.ganancia, formData.sinPrecioVenta]);


  // 3. Manejador de cambios
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
        setFormData((prev) => {
            if (name === 'sinPrecioVenta' && checked) {
                precioVentaManualRef.current = false;
            }
            return { ...prev, [name]: checked };
        });
        return;
    }
    
    // Lógica para detectar si el usuario ingresa un Precio de Venta manual
    if (name === 'costoVenta') {
        precioVentaManualRef.current = true;
    } else if ((name === 'costoCompra' || name === 'ganancia') && !formData.sinPrecioVenta) {
        precioVentaManualRef.current = false;
    }

    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };
  
  // 4. Manejador de Blur para campos de texto (ej. Nombre)
  const handleTextBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'nombre' || name === 'categoria' || name === 'proveedor') {
        setFormData(prevData => ({ ...prevData, [name]: value.toUpperCase() }));
    }
  };


  // 5. Manejador de envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.nombre.trim()) { alert('El nombre es obligatorio'); return; }
    if (!formData.categoria.trim()) { alert('La categoría es obligatoria.'); return; }
    
    // Transformar los datos a números y formato final para guardar
    onUpdate({
      id: insumo.id, // ID es crucial para la edición
      nombre: formData.nombre.toUpperCase(),
      categoria: normalizeCategoryName(formData.categoria),
      unidadMedida: formData.unidadMedida,
      stockMinimo: parseFloat(formData.stockMinimo || 0), // Usamos 0 si está vacío
      costoCompra: parseFloat(formData.costoCompra || 0),
      
      // Ganancia y costoVenta se ajustan por el checkbox sinPrecioVenta
      ganancia: formData.sinPrecioVenta ? 0 : parseFloat(formData.ganancia || 0) / 100,
      costoVenta: formData.sinPrecioVenta ? 0 : parseFloat(formData.costoVenta || 0),
      
      proveedor: formData.proveedor,
      sinPrecioVenta: formData.sinPrecioVenta,
      
      // IMPORTANTE: NUNCA se envía el campo 'cantidad' (stock)
    });
  };

  // 6. Renderizado
  return (
    <div className="form-page-container">
      <h3>Editar Insumo: {insumo?.nombre}</h3>
      <form className="inventario-form" onSubmit={handleSubmit}>
        
        {/* Campo Nombre (MAYÚSCULAS) */}
        <div className="form-group">
          <label>Nombre:</label>
          <input 
            type="text" 
            name="nombre" 
            value={formData.nombre} 
            onChange={handleChange} 
            onBlur={handleTextBlur}
            required 
          />
        </div>
        
        {/* Campo Categoría */}
        <div className="form-group">
          <label>Categoría:</label>
          <input 
            type="text" 
            name="categoria" 
            value={formData.categoria} 
            onChange={handleChange} 
            onBlur={handleTextBlur}
            required 
          />
        </div>

        {/* Campo Proveedor */}
        <div className="form-group">
          <label>Proveedor:</label>
          <input 
            type="text" 
            name="proveedor" 
            value={formData.proveedor} 
            onChange={handleChange} 
            onBlur={handleTextBlur}
            required 
          />
        </div>
        
        {/* Fila de Stock Actual, Stock Mínimo y Unidad de Medida */}
        <div className="form-row-group">
          
          {/* Campo de STOCK ACTUAL (CANTIDAD) - SOLO LECTURA */}
          <div className="form-group half-input">
            <label>Stock Actual (Cant.):</label>
            <input 
                type="text"
                value={`${insumo?.cantidad || 0} ${insumo?.unidadMedida || ''}`}
                readOnly 
                className="input-disabled"
            />
          </div>
          
          {/* Campo de Stock Mínimo (Editable) */}
          <div className="form-group half-input">
            <label>Stock Mínimo:</label>
            <input 
              type="number" 
              name="stockMinimo" 
              value={formData.stockMinimo} 
              onChange={handleChange} 
              min="0"
              step="any"
              required 
            />
          </div>
          
        </div>
        
        <div className="form-group">
            <label>Unidad de Medida:</label>
            <select name="unidadMedida" value={formData.unidadMedida} onChange={handleChange} required>
                {unidadesMedida.map(unid => (
                    <option key={unid} value={unid}>{unid}</option>
                ))}
            </select>
        </div>
        
        {/* Checkbox de Insumo sin Precio de Venta */}
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="sinPrecioVenta"
            checked={formData.sinPrecioVenta}
            onChange={handleChange}
          />
          Insumo sin precio de venta (no se vende)
        </label>
        
        <h4 className="section-separator">Precios y Ganancia</h4>
        
        {/* Campo Costo de Compra */}
        <div className="input-with-symbol">
          <span className="symbol-prefix">Bs.</span>
          <label>Costo de Compra:</label>
          <input 
            type="number" 
            step="0.01" 
            name="costoCompra" 
            value={formData.costoCompra} 
            onChange={handleChange} 
            min="0"
            required 
          />
        </div>
        
        {/* Campo Ganancia */}
        <div className="input-with-symbol" style={{ opacity: formData.sinPrecioVenta ? 0.6 : 1 }}>
          <label>Ganancia (%):</label>
          <input 
            type="number" 
            step="0.01" 
            name="ganancia" 
            value={formData.ganancia} 
            onChange={handleChange} 
            min="0"
            disabled={formData.sinPrecioVenta}
            required={!formData.sinPrecioVenta}
          />
          <span className="symbol-suffix">%</span>
        </div>
        
        {/* Campo Costo de Venta */}
        <div className="input-with-symbol" style={{ opacity: formData.sinPrecioVenta ? 0.6 : 1 }}>
          <span className="symbol-prefix">Bs.</span>
          <label>Costo de Venta:</label>
          <input 
            type="number" 
            step="0.01" 
            name="costoVenta" 
            value={formData.costoVenta} 
            onChange={handleChange} 
            min="0"
            disabled={formData.sinPrecioVenta}
            required={!formData.sinPrecioVenta}
          />
        </div>
        
        {/* Botones de Acción */}
        <div className="button-group">
          <button type="submit" className="btn-primary">Guardar Cambios</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default InventarioEditForm;