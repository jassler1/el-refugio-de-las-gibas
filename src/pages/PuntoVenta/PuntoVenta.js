import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    getDoc,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase'; // Ajusta ruta según tu proyecto
import './PuntoVentaUnificado.css';
import PaymentModal from './PaymentModal';

function PuntoVenta() {
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mesasActivas, setMesasActivas] = useState(['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4']);
    const [nextMesaNumber, setNextMesaNumber] = useState(5);
    const [selectedMesa, setSelectedMesa] = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroProducto, setFiltroProducto] = useState('');
    const [carrito, setCarrito] = useState([]);
    const [error, setError] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Guarda la comanda pendiente para una mesa
    const saveComanda = async (mesaId, comandaData) => {
        if (!mesaId) return;
        try {
            const comandaRef = doc(db, 'comandosPendientes', mesaId); 
            await setDoc(
                comandaRef,
                {
                    ...comandaData,
                    mesaId: mesaId,
                },
                { merge: true }
            );
        } catch (err) {
            console.error("Error al guardar la comanda:", err);
        }
    };

    // Carga la comanda si existe
    const loadComanda = async (mesaId) => {
        if (!mesaId) return null;
        try {
            const comandaRef = doc(db, 'comandosPendientes', mesaId); 
            const comandaSnap = await getDoc(comandaRef);
            if (comandaSnap.exists()) {
                return comandaSnap.data();
            }
            return null;
        } catch (err) {
            console.error("Error al cargar la comanda:", err);
            return null;
        }
    };

    useEffect(() => {
        const clientesQuery = collection(db, 'clientes');
        const insumosQuery = collection(db, 'insumos');
        const kitsQuery = collection(db, 'kits');

        const unsubscribeClientes = onSnapshot(
            clientesQuery,
            (querySnapshot) => {
                const lista = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setClientes(lista);
            },
            (err) => {
                console.error('Error al cargar clientes:', err);
                setError('Error al cargar clientes: ' + err.message);
            }
        );

        const unsubscribeInsumos = onSnapshot(
            insumosQuery,
            (querySnapshot) => {
                const insumosDisponibles = querySnapshot.docs
                    .filter((d) => d.data().costoVenta != null && d.data().costoVenta > 0)
                    .map((d) => ({
                        id: d.id,
                        ...d.data(),
                        type: 'insumo',
                        precioVenta: d.data().costoVenta,
                    }));
                
                setProductos((prev) => {
                    const kits = prev.filter((p) => p.type === 'kit');
                    return [...insumosDisponibles, ...kits];
                });
                setLoading(false);
            },
            (err) => {
                console.error('Error al cargar insumos:', err);
                setError('Error al cargar insumos: ' + err.message);
                setLoading(false);
            }
        );

        const unsubscribeKits = onSnapshot(
            kitsQuery,
            (querySnapshot) => {
                const kitsDisponibles = querySnapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                    type: 'kit',
                    precioVenta: d.data().precioVenta,
                }));
                setProductos((prev) => {
                    const insumos = prev.filter((p) => p.type === 'insumo');
                    return [...insumos, ...kitsDisponibles];
                });
                setLoading(false);
            },
            (err) => {
                console.error('Error al cargar kits:', err);
                setError('Error al cargar kits: ' + err.message);
                setLoading(false);
            }
        );

        return () => {
            unsubscribeClientes();
            unsubscribeInsumos();
            unsubscribeKits();
        };
    }, []);

    const handleAddMesa = () => {
        setMesasActivas((prev) => [...prev, `Mesa ${nextMesaNumber}`]);
        setNextMesaNumber((prev) => prev + 1);
    };

    const handleMesaClick = async (mesa) => {
        if (selectedMesa && selectedMesa !== mesa) {
            await saveComanda(selectedMesa, {
                carrito: carrito,
                clienteId: selectedCliente?.id || null,
            });
        }

        const comanda = await loadComanda(mesa);
        if (comanda) {
            const cliente = clientes.find((c) => c.id === comanda.clienteId);
            setCarrito(comanda.carrito || []);
            setSelectedCliente(cliente || null);
        } else {
            setCarrito([]);
            setSelectedCliente(null);
        }
        setSelectedMesa(mesa);
    };

    const handleClienteClick = (cliente) => {
        setSelectedCliente(cliente);
    };

    const handleAgregarAlCarrito = (producto) => {
        if (!selectedMesa) {
            alert("Por favor, selecciona una mesa primero.");
            return;
        }
        setCarrito((prev) => {
            const existing = prev.find((item) => item.id === producto.id);
            if (existing) {
                const nuevaCantidad = (typeof existing.cantidad === 'number' && !isNaN(existing.cantidad))
                    ? existing.cantidad + 1
                    : 1;
                return prev.map((item) =>
                    item.id === producto.id ? { ...item, cantidad: nuevaCantidad } : item
                );
            } else {
                const precioVenta = producto.precioVenta ?? 0;
                return [...prev, { ...producto, cantidad: 1, precioVenta }];
            }
        });
    };
    
    // Manejo carrito

    const handleEliminarDelCarrito = (productoId) => {
        setCarrito((prev) => prev.filter((item) => item.id !== productoId));
    };

    const handleIncrementarCantidad = (productoId) => {
        setCarrito((prev) =>
            prev.map((item) => {
                if (item.id === productoId) {
                    const nuevaCantidad = (typeof item.cantidad === 'number' && !isNaN(item.cantidad))
                        ? item.cantidad + 1
                        : 1;
                    return { ...item, cantidad: nuevaCantidad };
                }
                return item;
            })
        );
    };

    const handleDecrementarCantidad = (productoId) => {
        setCarrito((prev) => {
            return prev
                .map((item) => {
                    if (item.id === productoId) {
                        const nuevaCantidad = (typeof item.cantidad === 'number' && !isNaN(item.cantidad))
                            ? item.cantidad - 1
                            : 0;
                        return { ...item, cantidad: nuevaCantidad };
                    }
                    return item;
                })
                .filter((item) => item.cantidad > 0);
        });
    };

    const calcularTotal = () => {
        const subtotal = carrito.reduce((sum, item) => {
            const cantidad = (typeof item.cantidad === 'number' && !isNaN(item.cantidad)) ? item.cantidad : 0;
            const precio = (typeof item.precioVenta === 'number' && !isNaN(item.precioVenta)) ? item.precioVenta : 0;
            return sum + precio * cantidad;
        }, 0);

        const descuento = selectedCliente?.descuento
            ? subtotal * (selectedCliente.descuento / 100)
            : 0;

        return (subtotal - descuento).toFixed(2);
    };

    const handlePagar = async (metodoDePago, pagos) => {
        if (!selectedMesa || carrito.length === 0) {
            alert("El carrito está vacío o no hay mesa seleccionada.");
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                for (const item of carrito) {
                    const itemType = item.type;
                    const itemId = item.id;
                    const cantidadVendida = item.cantidad;

                    const inventarioRef = doc(db, itemType === 'insumo' ? 'insumos' : 'kits', itemId);
                    const inventarioSnap = await transaction.get(inventarioRef);

                    if (!inventarioSnap.exists()) {
                        throw new Error(`El documento de inventario para ${item.nombre} no existe.`);
                    }

                    const currentCantidad = inventarioSnap.data().cantidad;
                    if (currentCantidad < cantidadVendida) {
                        throw new Error(`Cantidad insuficiente para: ${item.nombre}. Disponible: ${currentCantidad}`);
                    }

                    const newCantidad = currentCantidad - cantidadVendida;
                    transaction.update(inventarioRef, { cantidad: newCantidad });
                }

                // Crear la venta
                const ventaRef = doc(collection(db, 'ventas'));
                transaction.set(ventaRef, {
                    mesaId: selectedMesa,
                    clienteId: selectedCliente?.id || null,
                    total: parseFloat(calcularTotal()),
                    articulos: carrito,
                    metodoDePago,
                    pagos,
                    timestamp: serverTimestamp(),
                });

                // Borrar la comanda pendiente
                const comandaRef = doc(db, 'comandosPendientes', selectedMesa);
                transaction.delete(comandaRef);
            });

            alert("Pago realizado con éxito. Inventario actualizado.");

            // Reiniciar estado
            setCarrito([]);
            setSelectedCliente(null);
            setSelectedMesa(null);
            setShowPaymentModal(false);

        } catch (err) {
            console.error("Error al procesar la transacción:", err);
            alert(`Ocurrió un error al procesar el pago: ${err.message}. Por favor, inténtalo de nuevo.`);
        }
    };


    const clientesFiltrados = clientes.filter(
        (c) =>
            c.nombreCompleto.toLowerCase().includes(filtroCliente.toLowerCase()) ||
            (c.ci && c.ci.includes(filtroCliente))
    );

    const productosFiltrados = productos.filter((p) =>
        p.nombre.toLowerCase().includes(filtroProducto.toLowerCase())
    );

    if (loading) return <div className="loading-message">Cargando datos...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="pos-container">
            <div className="sidebar-column">
                <div className="card-section">
                    <h3>Mesas</h3>
                    <div className="mesa-grid">
                        {mesasActivas.map((mesa) => (
                            <div
                                key={mesa}
                                className={`mesa-card ${selectedMesa === mesa ? 'active' : ''}`}
                                onClick={() => handleMesaClick(mesa)}
                            >
                                {mesa}
                            </div>
                        ))}
                        <div className="add-mesa-card" onClick={handleAddMesa}>
                            <span>+</span>
                            <p>Añadir Mesa</p>
                        </div>
                    </div>
                </div>

                <div className="card-section">
                    <h3>Clientes</h3>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Buscar cliente..."
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                    />
                    <div className="cliente-list">
                        {clientesFiltrados.map((cliente) => (
                            <div
                                key={cliente.id}
                                className={`cliente-item ${selectedCliente?.id === cliente.id ? 'active' : ''}`}
                                onClick={() => handleClienteClick(cliente)}
                            >
                                <p><strong>{cliente.nombreCompleto}</strong></p>
                                <p>CI: {cliente.ci}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="main-column">
                <div className="products-section">
                    <h3>Productos y Kits</h3>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Buscar producto..."
                        value={filtroProducto}
                        onChange={(e) => setFiltroProducto(e.target.value)}
                    />
                    <div className="product-grid">
                        {productosFiltrados.map((producto) => (
                            <div
                                key={producto.id}
                                className="product-card"
                                onClick={() => handleAgregarAlCarrito(producto)}
                            >
                                <p className="product-name">{producto.nombre}</p>
                                <p className="product-price">Bs. {(producto.precioVenta ?? 0).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="cart-section">
                    <h3>Pedido {selectedMesa ? `(${selectedMesa})` : ''}</h3>
                    {selectedCliente && (
                        <p className="selected-cliente-info">
                            Cliente: <strong>{selectedCliente.nombreCompleto}</strong>
                            {selectedCliente.descuento > 0 && (
                                <span className="descuento-applied"> ({selectedCliente.descuento}% desc.)</span>
                            )}
                        </p>
                    )}

                    <div className="cart-container">
                        {carrito.length > 0 ? (
                            carrito.map((item) => (
                                <div key={item.id} className="cart-item">
                                    <span className="item-details">
                                        <div className="quantity-controls">
                                            <button onClick={() => handleDecrementarCantidad(item.id)} className="btn-quantity">-</button>
                                            <span className="item-quantity">{item.cantidad}</span>
                                            <button onClick={() => handleIncrementarCantidad(item.id)} className="btn-quantity">+</button>
                                        </div>
                                        <span>{item.nombre}</span>
                                    </span>
                                    <span className="item-price">
                                        Bs. {(item.cantidad * (item.precioVenta ?? 0)).toFixed(2)}
                                    </span>
                                    <button onClick={() => handleEliminarDelCarrito(item.id)} className="btn-remove">X</button>
                                </div>
                            ))
                        ) : (
                            <p className="empty-cart-message">
                                {selectedMesa ? 'El carrito está vacío.' : 'Selecciona una mesa para empezar.'}
                            </p>
                        )}
                    </div>

                    <div className="total-section">
                        <strong>Total: Bs. {calcularTotal()}</strong>
                    </div>

                    <div className="payment-buttons">
                        <button
                            disabled={!selectedMesa || carrito.length === 0}
                            onClick={() => setShowPaymentModal(true)}
                            className="btn-pay"
                        >
                            Pagar
                        </button>
                    </div>
                </div>
            </div>

            {showPaymentModal && (
                <PaymentModal
                    onClose={() => setShowPaymentModal(false)}
                    onPagar={handlePagar}
                    total={parseFloat(calcularTotal())}
                />
            )}
        </div>
    );
}

export default PuntoVenta;