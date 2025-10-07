import React, { useState } from 'react';
import './PaymentModal.css'; // Asegúrate de crear también el CSS

function PaymentModal({ onClose, onPagar, total }) {
  const [metodoDePago, setMetodoDePago] = useState('efectivo');
  const [pagos, setPagos] = useState({ efectivo: total });

  const handlePagoChange = (tipo, valor) => {
    const monto = parseFloat(valor) || 0;
    setPagos((prev) => ({ ...prev, [tipo]: monto }));
  };

  const handlePagarClick = () => {
    const sumaPagos = Object.values(pagos).reduce((sum, val) => sum + val, 0);
    if (sumaPagos < total) {
      alert("El monto pagado es insuficiente.");
      return;
    }
    onPagar(metodoDePago, pagos);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Pago</h2>
        <p>Total a pagar: <strong>Bs. {total.toFixed(2)}</strong></p>

        <div className="form-group">
          <label>Método de pago:</label>
          <select
            value={metodoDePago}
            onChange={(e) => setMetodoDePago(e.target.value)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="mixto">Mixto</option>
          </select>
        </div>

        {metodoDePago === 'mixto' ? (
          <>
            <div className="form-group">
              <label>Pago en efectivo:</label>
              <input
                type="number"
                value={pagos.efectivo || ''}
                onChange={(e) => handlePagoChange('efectivo', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Pago en tarjeta:</label>
              <input
                type="number"
                value={pagos.tarjeta || ''}
                onChange={(e) => handlePagoChange('tarjeta', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Pago en transferencia:</label>
              <input
                type="number"
                value={pagos.transferencia || ''}
                onChange={(e) => handlePagoChange('transferencia', e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="form-group">
            <label>Monto pagado:</label>
            <input
              type="number"
              value={pagos[metodoDePago] || ''}
              onChange={(e) => handlePagoChange(metodoDePago, e.target.value)}
            />
          </div>
        )}

        <div className="modal-buttons">
          <button onClick={onClose} className="btn-cancelar">Cancelar</button>
          <button onClick={handlePagarClick} className="btn-confirmar">Confirmar Pago</button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;