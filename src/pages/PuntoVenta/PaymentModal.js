import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import './PaymentModal.css';

function PaymentModalMulti({ show, onClose, total, onPagar, selectedMesa }) {
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [pagos, setPagos] = useState({
        efectivo: '',
        tarjeta: '',
        qr: '',
    });

    if (!show) {
        return null;
    }

    // Convert total to float once for calculations
    const totalFloat = parseFloat(total) || 0; 
    
    // Calculate total paid in the 'multiple' scenario
    const totalPagadoMultiple =
        parseFloat(pagos.efectivo || 0) +
        parseFloat(pagos.tarjeta || 0) +
        parseFloat(pagos.qr || 0);

    const handlePagarClick = () => {
        // --- 1. MANEJO DE PAGO ÚNICO EN EFECTIVO ---
        if (metodoPago === 'efectivo') {
            const montoFloat = parseFloat(montoRecibido);
            
            if (isNaN(montoFloat) || montoFloat < totalFloat) {
                alert(`El monto recibido (Bs. ${montoRecibido}) es menor al total del pedido (Bs. ${total}).`);
                return;
            }

            // Pasa el monto total pagado en efectivo para el registro del cambio
            onPagar('Efectivo', { efectivo: montoFloat.toFixed(2) }); 
            return;
        }

        // --- 2. MANEJO DE PAGO ÚNICO (TARJETA/QR) ---
        if (metodoPago === 'tarjeta' || metodoPago === 'qr') {
             // Pasa el método y el monto total en el objeto de pagos
             onPagar(metodoPago, { [metodoPago]: totalFloat.toFixed(2) }); 
             return;
        }


        // --- 3. MANEJO DE PAGO MÚLTIPLE ---
        if (metodoPago === 'multiple') {
            // Utilizamos una tolerancia mínima para la comparación de floats
            const difference = Math.abs(totalPagadoMultiple - totalFloat);

            if (difference > 1e-6) { // Check if difference is greater than tolerance
                alert(`El total pagado (Bs. ${totalPagadoMultiple.toFixed(2)}) no coincide con el total del pedido (Bs. ${total}).`);
                return;
            }
            
            // Filtramos los pagos que son 0 antes de enviar
            const finalPagos = Object.fromEntries(
                Object.entries(pagos).filter(([key, value]) => parseFloat(value) > 0)
            );
            
            onPagar('Múltiple', finalPagos);
            return;
        }

        // Fallback for unexpected state
        alert("Selecciona un método de pago válido.");
    };

    const handlePagoChange = (e) => {
        const { name, value } = e.target;
        setPagos((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleMontoRecibidoChange = (e) => {
        setMontoRecibido(e.target.value);
    };

    const cambio = parseFloat(montoRecibido) - totalFloat;

    // Data para el QR (usando el total del pedido, no el monto recibido)
    const qrData = JSON.stringify({
        mesa: selectedMesa,
        total: totalFloat,
        metodo: 'QR',
    });

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Pagar Pedido de {selectedMesa}</h2>
                    <button className="close-btn" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="modal-body">
                    <p>
                        Total a pagar: <strong>Bs. {totalFloat.toFixed(2)}</strong>
                    </p>

                    <div className="payment-options">
                        <button
                            className={`payment-option-btn ${metodoPago === 'efectivo' ? 'active' : ''}`}
                            onClick={() => {
                                setMetodoPago('efectivo');
                                setMontoRecibido('');
                            }}
                        >
                            Efectivo 💵
                        </button>
                        <button
                            className={`payment-option-btn ${metodoPago === 'tarjeta' ? 'active' : ''}`}
                            onClick={() => setMetodoPago('tarjeta')}
                        >
                            Tarjeta 💳
                        </button>
                        <button
                            className={`payment-option-btn ${metodoPago === 'qr' ? 'active' : ''}`}
                            onClick={() => setMetodoPago('qr')}
                        >
                            Código QR 🤳
                        </button>
                        <button
                            className={`payment-option-btn ${metodoPago === 'multiple' ? 'active' : ''}`}
                            onClick={() => setMetodoPago('multiple')}
                        >
                            Múltiple 🔄
                        </button>
                    </div>

                    <div className="payment-details">
                        {metodoPago === 'efectivo' && (
                            <div className="payment-details-option">
                                <p>Confirma el pago en efectivo con el cliente.</p>
                                <input
                                    type="number"
                                    placeholder="Monto recibido en Bs."
                                    className="input-efectivo"
                                    value={montoRecibido}
                                    onChange={handleMontoRecibidoChange}
                                />
                                {cambio >= 0 && (
                                    <p className="cambio-text">
                                        Cambio a dar: <strong>Bs. {cambio.toFixed(2)}</strong>
                                    </p>
                                )}
                                {cambio < 0 && montoRecibido !== '' && (
                                    <p className="insufficient-text">Monto insuficiente.</p>
                                )}
                            </div>
                        )}
                        {metodoPago === 'tarjeta' && (
                            <div className="payment-details-option">
                                <p>Procesa el pago con tu terminal de tarjeta.</p>
                                <p className="card-instructions">Monto: Bs. {totalFloat.toFixed(2)}</p>
                            </div>
                        )}
                        {metodoPago === 'qr' && (
                            <div className="payment-details-option qr-container">
                                <p>Escanea este código para completar el pago.</p>
                                <div className="qr-code">
                                    {/* Usamos totalFloat en el QR data */}
                                    <QRCode value={JSON.stringify({ mesa: selectedMesa, total: totalFloat.toFixed(2) })} size={150} />
                                </div>
                            </div>
                        )}
                        {metodoPago === 'multiple' && (
                            <div className="payment-details-option">
                                <h4>Total Pendiente: <span style={{color: totalFloat - totalPagadoMultiple > 0 ? 'red' : 'green'}}>Bs. {(totalFloat - totalPagadoMultiple).toFixed(2)}</span></h4>
                                <div className="multiple-payment-form">
                                    <div className="input-group">
                                        <label>Efectivo (Bs.):</label>
                                        <input
                                            type="number"
                                            name="efectivo"
                                            value={pagos.efectivo}
                                            onChange={handlePagoChange}
                                            placeholder="Monto"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Tarjeta (Bs.):</label>
                                        <input
                                            type="number"
                                            name="tarjeta"
                                            value={pagos.tarjeta}
                                            onChange={handlePagoChange}
                                            placeholder="Monto"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>QR (Bs.):</label>
                                        <input
                                            type="number"
                                            name="qr"
                                            value={pagos.qr}
                                            onChange={handlePagoChange}
                                            placeholder="Monto"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button 
                        className="btn-primary" 
                        onClick={handlePagarClick}
                        // Disable if in multiple mode and total paid doesn't match total required
                        disabled={metodoPago === 'multiple' && Math.abs(totalPagadoMultiple - totalFloat) > 1e-6}
                    >
                        Confirmar Pago
                    </button>
                    <button className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PaymentModalMulti;