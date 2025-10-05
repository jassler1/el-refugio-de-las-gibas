import React, { useState } from 'react';

function AddStockForm({ insumos, onUpdate, onCancel }) {
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cantidadNum = parseFloat(cantidad);
    if (!insumoId || isNaN(cantidadNum) || cantidadNum <= 0) {
      alert('Selecciona un insumo y una cantidad válida.');
      return;
    }

    onUpdate(insumoId, cantidadNum);
  };

  return (
    <div className="form-modal-overlay">
      <form className="add-stock-form" onSubmit={handleSubmit}>
        <h3>Agregar Stock</h3>

        <div className="form-group">
          <label htmlFor="insumo-select">Selecciona un Insumo:</label>
          <select
            id="insumo-select"
            value={insumoId}
            onChange={(e) => setInsumoId(e.target.value)}
            required
          >
            <option value="">-- Selecciona --</option>
            {insumos.map(insumo => (
              <option key={insumo.id} value={insumo.id}>
                {insumo.nombre} (Stock actual: {insumo.cantidad ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="cantidad">Cantidad a agregar:</label>
          <input
            type="number"
            id="cantidad"
            min="0.01"
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej: 10.5"
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">Actualizar Stock</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default AddStockForm;
