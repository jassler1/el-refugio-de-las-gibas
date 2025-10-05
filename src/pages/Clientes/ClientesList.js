import React, { useState } from 'react';

function ClientesList({ clientes, totalGastado, filtroNombre, setFiltroNombre, setCurrentView }) {
    const [showTopConsumers, setShowTopConsumers] = useState(false);

    const clientesFiltrados = clientes.filter(cliente =>
        cliente.nombreCompleto.toLowerCase().includes(filtroNombre.toLowerCase()) ||
        cliente.ci.toLowerCase().includes(filtroNombre.toLowerCase())
    );

    const getTopConsumers = () => {
        const clientesConGasto = clientes.map(cliente => ({
            ...cliente,
            gastoTotal: totalGastado[cliente.id] || 0
        }));

        clientesConGasto.sort((a, b) => b.gastoTotal - a.gastoTotal);
        return clientesConGasto.filter(c => c.gastoTotal > 0).slice(0, 10);
    };

    const topConsumersList = getTopConsumers();

    return (
        <div>
            <div className="header-actions">
                <input
                    type="text"
                    placeholder="Buscar por nombre o CI..."
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                    className="filter-input"
                />
                <button onClick={() => setCurrentView('add')} className="btn-add">Añadir Nuevo Cliente</button>
                <button onClick={() => setShowTopConsumers(true)} className="btn-top">Top Consumidores 🏆</button>
            </div>

            <div className="table-container">
                <table className="clientes-table">
                    <thead>
                        <tr>
                            <th>Nombre Completo</th>
                            <th>CI</th>
                            <th>Teléfono</th>
                            <th>Descuento (%)</th>
                            <th>Total Gastado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientesFiltrados.length > 0 ? (
                            clientesFiltrados.map((cliente) => (
                                <tr key={cliente.id}>
                                    <td>{cliente.nombreCompleto}</td>
                                    <td>{cliente.ci}</td>
                                    <td>{cliente.telefono}</td>
                                    <td>{cliente.descuento || 0}</td>
                                    <td>Bs. {(totalGastado[cliente.id] || 0).toFixed(2)}</td>
                                    <td>
                                        <button className="btn-edit">Editar</button>
                                        <button className="btn-delete">Eliminar</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="no-results">No se encontraron clientes.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showTopConsumers && (
                <div className="top-consumers-modal-backdrop">
                    <div className="top-consumers-modal-content">
                        <div className="modal-header">
                            <h2>Top 10 Consumidores</h2>
                            <button className="close-btn" onClick={() => setShowTopConsumers(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {topConsumersList.length > 0 ? (
                                <ol className="top-consumers-list">
                                    {topConsumersList.map((cliente, index) => (
                                        <li key={index}>
                                            <span className="consumer-rank">#{index + 1}</span>
                                            <span className="consumer-name">{cliente.nombreCompleto}</span>
                                            <span className="consumer-gasto">Bs. {cliente.gastoTotal.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="no-results">No hay consumidores con gastos registrados.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientesList;