import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './CrearKitForm.css';

function CrearKitForm({ insumos, onCrearKit, onCancel }) {
  const [nombreKit, setNombreKit] = useState('');
  const [nombreError, setNombreError] = useState('');
  const [componentes, setComponentes] = useState([{ insumoId: '', cantidadNecesaria: '' }]);
  const [gananciaPorcentaje, setGananciaPorcentaje] = useState(0);

  // --- FUNCIONES AUXILIARES ---
  const getCostoComponente = useCallback((comp) => {
    const insumo = insumos.find(i => i.id === comp.insumoId);
    const cantidad = parseFloat(comp.cantidadNecesaria);

    if (insumo && !isNaN(cantidad) && cantidad > 0) {
      const costoTotalOriginal = insumo.costoCompra || 0;
      const cantidadReferencia = insumo.cantidadOriginalCompra || insumo.cantidad || 1;

      if (cantidadReferencia <= 0) return 0;

      const costoUnitario = costoTotalOriginal / cantidadReferencia;
      return costoUnitario * cantidad;
    }

    return 0;
  }, [insumos]);

  const calcularMaxKits = useCallback(() => {
    let kitsMaximos = Infinity;
    let insumoLimitante = 'N/A';

    componentes.forEach(comp => {
      const insumo = insumos.find(i => i.id === comp.insumoId);
      const cantidadNecesaria = parseFloat(comp.cantidadNecesaria);

      if (insumo && cantidadNecesaria > 0) {
        const stockActual = parseFloat(insumo.cantidad) || 0;
        const kitsPosibles = Math.floor(stockActual / cantidadNecesaria);

        if (kitsPosibles < kitsMaximos) {
          kitsMaximos = kitsPosibles;
          insumoLimitante = insumo.nombre;
        }
      }
    });

    if (kitsMaximos === Infinity || kitsMaximos < 0) {
      return { limite: 0, insumoLimitante: 'N/A' };
    }

    return { limite: kitsMaximos, insumoLimitante };
  }, [componentes, insumos]);

  const costoTotal = useMemo(() => {
    return parseFloat(
      componentes.reduce((acc, comp) => acc + getCostoComponente(comp), 0).toFixed(2)
    );
  }, [componentes, getCostoComponente]);

  const precioVenta = useMemo(() => {
    const gananciaDecimal = parseFloat(gananciaPorcentaje) / 100;
    return parseFloat((costoTotal * (1 + gananciaDecimal)).toFixed(2)) || 0;
  }, [costoTotal, gananciaPorcentaje]);

  const maxKits = useMemo(() => calcularMaxKits(), [calcularMaxKits]);

  // --- VALIDACIÓN ---
  const esFormularioValido = () => {
    if (!nombreKit || nombreError) return false;

    const camposInvalidos = componentes.some(
      comp => !comp.insumoId || parseFloat(comp.cantidadNecesaria) <= 0
    );

    const idsDuplicados = new Set();
    for (let comp of componentes) {
      if (idsDuplicados.has(comp.insumoId)) return false;
      if (comp.insumoId) idsDuplicados.add(comp.insumoId);
    }

    return !camposInvalidos;
  };

  // --- MANEJADORES ---
  const handleAddComponente = () =>
    setComponentes(prev => [...prev, { insumoId: '', cantidadNecesaria: '' }]);

  const handleRemoveComponente = (index) =>
    setComponentes(prev => prev.filter((_, i) => i !== index));

  const handleComponenteChange = (index, field, value) => {
    const updated = [...componentes];
    updated[index][field] = value;
    setComponentes(updated);
  };

  const handleNombreChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setNombreKit(value);
      setNombreError('');
    } else {
      setNombreError('El nombre solo puede contener letras y espacios.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!esFormularioValido()) {
      alert('Corrige los errores del formulario.');
      return;
    }

    const kit = {
      nombre: nombreKit.trim().toUpperCase(),
      cantidad: 0,
      componentes: componentes.map(comp => ({
        ...comp,
        cantidadNecesaria: parseFloat(comp.cantidadNecesaria),
      })),
      gananciaPorcentaje: parseFloat(gananciaPorcentaje),
      costoTotal,
      precioVenta,
    };

    onCrearKit(kit);
  };

  // --- RENDER ---
  return (
    <div className="kit-form-container">
      <form className="kit-form" onSubmit={handleSubmit}>
        <h3>Crear Nuevo Kit</h3>

        <div className="form-group">
          <label htmlFor="nombre-kit">Nombre del Kit:</label>
          <input
            id="nombre-kit"
            type="text"
            value={nombreKit}
            onChange={handleNombreChange}
            placeholder="Ej: Refresco de Sandía"
            required
          />
          {nombreError && <p className="error-message">{nombreError}</p>}
        </div>

        <h4 className="components-heading">Componentes:</h4>

        {componentes.map((comp, index) => {
          const insumo = insumos.find(i => i.id === comp.insumoId);
          const unidad = insumo?.unidadMedida || 'unid.';
          const stock = parseFloat(insumo?.cantidad) || 0;
          const cantNecesaria = parseFloat(comp.cantidadNecesaria);
          const kitsPosibles = (stock > 0 && cantNecesaria > 0)
            ? Math.floor(stock / cantNecesaria)
            : 0;

          return (
            <div className="kit-component-row" key={index}>
              <select
                value={comp.insumoId}
                onChange={(e) => handleComponenteChange(index, 'insumoId', e.target.value)}
                required
              >
                <option value="">-- Seleccionar insumo --</option>
                {insumos.map(insumo => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nombre} ({insumo.unidadMedida}) - Stock: {insumo.cantidad}
                  </option>
                ))}
              </select>

              <div className="input-with-unit">
                <input
                  type="number"
                  placeholder={`Cantidad (${unidad})`}
                  value={comp.cantidadNecesaria}
                  onChange={(e) => handleComponenteChange(index, 'cantidadNecesaria', e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                />
                <span className="unit">{unidad}</span>
              </div>

              <div className="component-limit">
                Max: <strong>{kitsPosibles}</strong> kits
              </div>

              <div className="component-cost">
                Bs. {getCostoComponente(comp).toFixed(2)}
              </div>

              {componentes.length > 1 && (
                <button
                  type="button"
                  className="remove-component-btn"
                  onClick={() => handleRemoveComponente(index)}
                  title="Eliminar componente"
                >
                  &times;
                </button>
              )}
            </div>
          );
        })}

        <button type="button" onClick={handleAddComponente} className="add-component-btn">
          + Agregar componente
        </button>

        {/* Límite de producción */}
        <div className="limit-summary-section">
          <h4 className="limit-title">Límite de Producción Actual:</h4>
          <p className={`limit-value ${maxKits.limite === 0 ? 'limit-danger' : 'limit-ok'}`}>
            Se pueden fabricar <strong>{maxKits.limite}</strong> kits
          </p>
          {maxKits.limite > 0 && maxKits.insumoLimitante !== 'N/A' && (
            <p className="limiting-factor">
              Insumo limitante: <strong>{maxKits.insumoLimitante}</strong>
            </p>
          )}
          {maxKits.limite === 0 && (
            <p className="limiting-factor limit-danger">
              ¡Stock insuficiente para fabricar incluso 1 kit!
            </p>
          )}
        </div>

        <div className="summary-section">
          <p><strong>Costo Total (1 Kit):</strong> Bs. {costoTotal.toFixed(2)}</p>
        </div>

        <div className="form-group">
          <label htmlFor="ganancia">Ganancia Esperada (%):</label>
          <input
            id="ganancia"
            type="number"
            value={gananciaPorcentaje}
            onChange={(e) => setGananciaPorcentaje(e.target.value)}
            min="0"
            step="0.1"
            placeholder="Ej: 25"
          />
        </div>

        <div className="summary-section final-price">
          <p><strong>Precio de Venta Sugerido:</strong> Bs. {precioVenta.toFixed(2)}</p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={!esFormularioValido()}>
            Crear Kit
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default CrearKitForm;
