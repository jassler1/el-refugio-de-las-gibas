import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase'; // Asegúrate de que esta ruta sea correcta
import './Inventario.css';

// Importación de componentes (asumiendo que existen)
import InventarioForm from './InventarioForm';
import AddStockForm from './AddStockForm';
import VentasEsperadas from './VentasEsperadas';
import CrearKitForm from './CrearKitForm';
import ProductosMasVendidos from './ProductosMasVendidos';

const VIEWS = {
    INVENTORY: 'inventory',
    ADD_INSUMO: 'addInsumo',
    ADD_STOCK: 'addStock',
    VENTAS_ESPERADAS: 'ventasEsperadas',
    CREAR_KIT: 'crearKit',
    EDIT_INSUMO: 'editInsumo',
    PRODUCTOS_VENDIDOS: 'productosVendidos',
};

// Helper para formatear dinero de forma segura
const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num)) return '0.00';
    return num.toFixed(2);
};

// Componente optimizado para la fila de insumos
const InsumoRow = React.memo(({ insumo, onEdit, onDelete }) => {
    // Cálculo de bajo stock
    const isLowStock = (insumo.cantidad ?? 0) <= (insumo.stockMinimo ?? 0);

    // Cálculo y formato de Ganancia y Costo de Venta
    const { gananciaPorcentaje, costoVentaDisplay } = useMemo(() => {
        const ganancia = insumo.ganancia;
        const costoVenta = insumo.costoVenta;
        const sinPrecioVenta = insumo.sinPrecioVenta;

        const gP = sinPrecioVenta || ganancia == null
            ? 'N/A'
            : `${Math.round((ganancia ?? 0) * 100)}%`;

        const cV = sinPrecioVenta || costoVenta == null
            ? 'N/A'
            : `Bs. ${formatMoney(costoVenta)}`;

        return { gananciaPorcentaje: gP, costoVentaDisplay: cV };
    }, [insumo.ganancia, insumo.costoVenta, insumo.sinPrecioVenta]);

    return (
        <tr className={isLowStock ? 'low-stock' : ''}>
            <td>{insumo.nombre}</td>
            <td>{insumo.codigo}</td>
            <td>{insumo.categoria}</td>
            <td>{insumo.cantidad ?? 0}</td>
            <td>{insumo.stockMinimo ?? 0}</td>
            <td>{insumo.unidadMedida}</td>
            <td>Bs. {formatMoney(insumo.costoCompra)}</td>
            <td>{gananciaPorcentaje}</td>
            <td>{costoVentaDisplay}</td>
            <td>{insumo.proveedor}</td>
            <td>
                <button className="action-button edit-button" onClick={() => onEdit(insumo.id)}>
                    Editar
                </button>
                <button className="action-button delete-button" onClick={() => onDelete(insumo.id)}>
                    Eliminar
                </button>
            </td>
        </tr>
    );
});

function Inventario({ userId }) {
    const [insumos, setInsumos] = useState([]);
    const [kits, setKits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentView, setCurrentView] = useState(VIEWS.INVENTORY);
    const [filtroNombre, setFiltroNombre] = useState('');
    const [editingInsumo, setEditingInsumo] = useState(null);

    // ====================================
    // 1. Efecto de Carga de Datos (Firebase)
    // ====================================
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Listener para Insumos
        const insumosQuery = query(collection(db, 'insumos'), where('userId', '==', userId));
        const unsubscribeInsumos = onSnapshot(
            insumosQuery,
            (querySnapshot) => {
                const listaInsumos = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setInsumos(listaInsumos);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error in snapshot listener for insumos:', err);
                setError(`Error al cargar los insumos: ${err.message}. Revisa tus permisos de acceso.`);
                setLoading(false);
            }
        );

        // Listener para Kits
        const kitsQuery = query(collection(db, 'kits'), where('userId', '==', userId));
        const unsubscribeKits = onSnapshot(
            kitsQuery,
            (querySnapshot) => {
                const listaKits = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setKits(listaKits);
                setError(null);
            },
            (err) => {
                console.error('Error in snapshot listener for kits:', err);
                // No sobrescribe un error de insumos si ya existe
                setError((prev) =>
                    prev ? prev : `Error al cargar los kits: ${err.message}. Revisa tus permisos de acceso.`
                );
            }
        );

        // Función de limpieza
        return () => {
            // Se añaden bloques try-catch para un apagado seguro de listeners (aunque ya lo tenías)
            try {
                unsubscribeInsumos && unsubscribeInsumos();
                unsubscribeKits && unsubscribeKits();
            } catch (e) {
                // Silenciar errores de desuscripción si la conexión ya está cerrada
            }
        };
    }, [userId]);

    // ====================================
    // 2. Funciones de Lógica y Helpers
    // ====================================

    // Función para calcular límites de kits (memorizada)
    const calculateKitLimits = useCallback((componentes, currentInsumos = []) => {
        let maxKitsPosibles = Infinity;
        let insumoLimitante = 'Ninguno';

        if (!componentes || componentes.length === 0) {
            return { maxKitsPosibles: 0, insumoLimitante: 'Sin componentes' };
        }

        for (const comp of componentes) {
            const insumo = currentInsumos.find((i) => i.id === comp.insumoId);
            if (!insumo) {
                // Si el insumo no existe, no se puede fabricar el kit
                return { maxKitsPosibles: 0, insumoLimitante: `Insumo ID ${comp.insumoId} no encontrado` };
            }

            const stockDisponible = Number(insumo.cantidad ?? 0);
            const cantidadNecesaria = Number(comp.cantidadNecesaria ?? comp.cantidad ?? 0);

            if (!isFinite(cantidadNecesaria) || cantidadNecesaria <= 0) {
                continue;
            }

            const kitsPosibles = Math.floor(stockDisponible / cantidadNecesaria);

            if (kitsPosibles < maxKitsPosibles) {
                maxKitsPosibles = kitsPosibles;
                insumoLimitante = insumo.nombre ?? insumo.id;
            }
        }

        return {
            maxKitsPosibles: maxKitsPosibles === Infinity ? 0 : maxKitsPosibles,
            insumoLimitante: maxKitsPosibles === Infinity ? 'N/A' : insumoLimitante,
        };
    }, []);

    // Función para generar el código (memorizada)
    const generarCodigo = useCallback(
        (categoria = '', nombre = '') => {
            const cat = String(categoria ?? '').toUpperCase();
            const nom = String(nombre ?? '').toUpperCase();
            let prefijo = '';

            if (cat === 'AGUA') {
                prefijo = 'A';
            } else if (cat === 'GASEOSA') {
                prefijo = nom.replace(/\s+/g, '').substring(0, 2).toUpperCase() || 'G';
            } else {
                prefijo = cat.charAt(0) || 'X';
            }

            const maxNumero = insumos.reduce((max, insumo) => {
                const codigo = insumo.codigo;
                if (codigo && String(codigo).startsWith(prefijo)) {
                    const numeroStr = String(codigo).substring(prefijo.length);
                    const numero = parseInt(numeroStr, 10);
                    if (!isNaN(numero) && numero > max) return numero;
                }
                return max;
            }, 0);

            const siguienteNumero = (maxNumero + 1).toString().padStart(3, '0');
            return prefijo + siguienteNumero;
        },
        [insumos]
    );

    // Insumos filtrados (memorizados)
    const insumosFiltrados = useMemo(() => {
        const filtro = String(filtroNombre ?? '').toLowerCase().trim();
        if (!filtro) return insumos;
        return insumos.filter(
            (insumo) =>
                String(insumo.nombre ?? '').toLowerCase().includes(filtro) ||
                String(insumo.codigo ?? '').toLowerCase().includes(filtro)
        );
    }, [insumos, filtroNombre]);

    // ====================================
    // 3. Handlers de CRUD y Navegación
    // ====================================

    // Handler para Agregar Insumo
    const handleAddInsumo = async (newInsumo) => {
        if (!userId) {
            alert('Usuario no autenticado. Por favor, inicia sesión.');
            return;
        }

        if (!newInsumo) return;

        if (newInsumo.id) {
            // Si tiene ID, se trata de una actualización forzada
            return handleUpdateInsumo(newInsumo);
        }

        try {
            const nombre = String(newInsumo.nombre ?? '').toUpperCase();
            const categoria = String(newInsumo.categoria ?? '').toUpperCase();
            const codigoGenerado = generarCodigo(categoria, nombre);

            const dataToSave = {
                ...newInsumo,
                nombre,
                categoria,
                codigo: codigoGenerado,
                userId,
                cantidad: Number(newInsumo.cantidad ?? 0),
                costoCompra:
                    newInsumo.costoCompra != null ? Number(newInsumo.costoCompra) : Number(0).toFixed(2),
                costoVenta: newInsumo.costoVenta != null ? Number(newInsumo.costoVenta) : null,
                creadoEn: new Date(),
            };

            await addDoc(collection(db, 'insumos'), dataToSave);
            alert('Insumo agregado exitosamente.');
            setCurrentView(VIEWS.INVENTORY);
        } catch (error) {
            console.error('Error al agregar insumo:', error);
            alert('Error al agregar insumo: ' + (error?.message ?? String(error)));
        }
    };

    // Handler para Actualizar Stock
    const handleUpdateStock = async (insumoId, cantidadToAdd) => {
        try {
            const insumoRef = doc(db, 'insumos', insumoId);
            const currentInsumo = insumos.find((i) => i.id === insumoId);
            if (currentInsumo) {
                const newCantidad = Number(currentInsumo.cantidad ?? 0) + Number(cantidadToAdd ?? 0);
                await updateDoc(insumoRef, { cantidad: newCantidad });
                alert(`Stock actualizado. Nueva cantidad: ${newCantidad}`);
                setCurrentView(VIEWS.INVENTORY);
            } else {
                throw new Error('Insumo no encontrado para actualizar stock.');
            }
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            alert('Error al actualizar stock: ' + (error?.message ?? String(error)));
        }
    };

    // Handler para Actualizar Insumo
    const handleUpdateInsumo = async (updatedInsumo) => {
        try {
            if (!updatedInsumo?.id) {
                throw new Error('ID de insumo no válido para la actualización.');
            }

            const insumoId = updatedInsumo.id;
            const { id, ...dataToUpdate } = updatedInsumo;
            
            // Asegurar tipos correctos en campos numéricos
            if (dataToUpdate.cantidad != null) dataToUpdate.cantidad = Number(dataToUpdate.cantidad);
            if (dataToUpdate.costoCompra != null) dataToUpdate.costoCompra = Number(dataToUpdate.costoCompra);
            if (dataToUpdate.costoVenta != null) dataToUpdate.costoVenta = Number(dataToUpdate.costoVenta);
            if (dataToUpdate.stockMinimo != null) dataToUpdate.stockMinimo = Number(dataToUpdate.stockMinimo);
            
            // Convertir a mayúsculas si es necesario (el formulario podría no hacerlo)
            if (dataToUpdate.nombre != null) dataToUpdate.nombre = String(dataToUpdate.nombre).toUpperCase();
            if (dataToUpdate.categoria != null) dataToUpdate.categoria = String(dataToUpdate.categoria).toUpperCase();

            const insumoRef = doc(db, 'insumos', insumoId);
            await updateDoc(insumoRef, dataToUpdate);
            setCurrentView(VIEWS.INVENTORY);
            setEditingInsumo(null);
            alert('Insumo actualizado exitosamente.');
        } catch (error) {
            console.error('Error al actualizar insumo:', error);
            alert('Error al actualizar insumo: ' + (error?.message ?? String(error)));
        }
    };

    // Handler para Crear Kit
    const handleCrearKit = async (kitData) => {
        if (!userId) {
            alert('Usuario no autenticado. Por favor, inicia sesión.');
            return;
        }
        try {
            const costoTotalCompra = Number(kitData.costoTotal ?? kitData.costoCompra ?? 0);
            const precioVenta = Number(kitData.precioVenta ?? 0);
            const ganancia = precioVenta - costoTotalCompra;

            const { maxKitsPosibles, insumoLimitante } = calculateKitLimits(
                kitData.componentes ?? [],
                insumos
            );

            // Preparar componentes para guardar
            const componentesParaKit = (kitData.componentes ?? []).map((comp) => {
                const insumo = insumos.find((i) => i.id === comp.insumoId);
                return {
                    insumoId: comp.insumoId,
                    nombreInsumo: insumo?.nombre ?? 'Desconocido',
                    cantidad: Number(comp.cantidadNecesaria ?? comp.cantidad ?? 0),
                };
            });

            await addDoc(collection(db, 'kits'), {
                nombre: kitData.nombre ?? 'Sin nombre',
                costoCompra: Number(costoTotalCompra.toFixed(2)),
                precioVenta: Number(precioVenta.toFixed(2)),
                ganancia: Number(ganancia.toFixed(2)),
                componentes: componentesParaKit,
                userId,
                creadoEn: new Date(),
                maxKitsPosibles,
                insumoLimitante,
            });

            alert(`Kit "${kitData.nombre}" creado exitosamente (El stock de insumos NO fue descontado).`);
            setCurrentView(VIEWS.INVENTORY);
        } catch (error) {
            console.error('Error al crear el kit:', error);
            alert('Error al crear el kit: ' + (error?.message ?? String(error)));
        }
    };

    // Handler para Eliminar Insumo
    const handleDeleteInsumo = useCallback(async (insumoId) => {
        if (!insumoId) return;
        if (window.confirm('¿Estás seguro de que quieres eliminar este insumo? Esta acción es irreversible.')) {
            try {
                await deleteDoc(doc(db, 'insumos', insumoId));
                alert('Insumo eliminado correctamente.');
            } catch (error) {
                console.error('Error al eliminar el insumo:', error);
                alert('Error al eliminar el insumo: ' + (error?.message ?? String(error)));
            }
        }
    }, []);

    // Handler para Eliminar Kit
    const handleDeleteKit = useCallback(async (kitId) => {
        if (!kitId) return;
        if (window.confirm('¿Estás seguro de que quieres eliminar este kit? Esta acción es irreversible.')) {
            try {
                await deleteDoc(doc(db, 'kits', kitId));
                alert('Kit eliminado correctamente.');
            } catch (error) {
                console.error('Error al eliminar el kit:', error);
                alert('Error al eliminar el kit: ' + (error?.message ?? String(error)));
            }
        }
    }, []);

    // Handler para Editar Insumo (navegación)
    const handleEditInsumo = useCallback(
        (insumoId) => {
            const insumoToEdit = insumos.find((insumo) => insumo.id === insumoId);
            if (insumoToEdit) {
                setEditingInsumo(insumoToEdit);
                setCurrentView(VIEWS.EDIT_INSUMO);
            } else {
                alert('Insumo no encontrado para editar.');
            }
        },
        [insumos]
    );

    // Handler para Editar Kit (no implementado, solo alerta)
    const handleEditKit = useCallback((kitId) => {
        alert(`Función de edición para el kit con ID: ${kitId} no implementada.`);
    }, []);

    // ====================================
    // 4. Renderizado Condicional
    // ====================================

    const renderContent = () => {
        switch (currentView) {
            case VIEWS.ADD_INSUMO:
                return (
                    <div className="form-modal-overlay">
                        {/* Se usa onSave para agregar un nuevo insumo */}
                        <InventarioForm onSave={handleAddInsumo} onCancel={() => setCurrentView(VIEWS.INVENTORY)} insumos={insumos} />
                    </div>
                );
            case VIEWS.EDIT_INSUMO:
                return (
                    <div className="form-modal-overlay">
                        {/* Se usa onSave para actualizar el insumo existente */}
                        <InventarioForm
                            initialData={editingInsumo}
                            onSave={handleUpdateInsumo}
                            onCancel={() => {
                                setCurrentView(VIEWS.INVENTORY);
                                setEditingInsumo(null);
                            }}
                            insumos={insumos}
                        />
                    </div>
                );
            case VIEWS.ADD_STOCK:
                return (
                    <div className="form-modal-overlay">
                        <AddStockForm insumos={insumos} onUpdate={handleUpdateStock} onCancel={() => setCurrentView(VIEWS.INVENTORY)} />
                    </div>
                );
            case VIEWS.VENTAS_ESPERADAS:
                return (
                    <div className="form-page-container">
                        <VentasEsperadas insumos={insumos} />
                        <button className="back-button" onClick={() => setCurrentView(VIEWS.INVENTORY)}>
                            Volver al inventario
                        </button>
                    </div>
                );
            case VIEWS.CREAR_KIT:
                return (
                    <div className="form-modal-overlay">
                        <CrearKitForm
                            insumos={insumos}
                            onCrearKit={handleCrearKit}
                            onCancel={() => setCurrentView(VIEWS.INVENTORY)}
                            calculateLimits={calculateKitLimits}
                        />
                    </div>
                );
            case VIEWS.PRODUCTOS_VENDIDOS:
                return <ProductosMasVendidos userId={userId} onCancel={() => setCurrentView(VIEWS.INVENTORY)} />;
            case VIEWS.INVENTORY:
            default:
                return (
                    <>
                        <div className="top-controls-container">
                            <div className="filter-container">
                                <input
                                    type="text"
                                    placeholder="Filtrar por nombre o código..."
                                    value={filtroNombre}
                                    onChange={(e) => setFiltroNombre(e.target.value)}
                                />
                            </div>
                            <div className="button-group">
                                <button className="btn-primary" onClick={() => setCurrentView(VIEWS.ADD_INSUMO)}>
                                    Agregar Insumo
                                </button>
                                <button className="btn-secondary" onClick={() => setCurrentView(VIEWS.ADD_STOCK)}>
                                    Agregar Stock
                                </button>
                                <button className="btn-secondary" onClick={() => setCurrentView(VIEWS.VENTAS_ESPERADAS)}>
                                    Ventas Esperadas
                                </button>
                                <button className="btn-secondary" onClick={() => setCurrentView(VIEWS.CREAR_KIT)}>
                                    Crear Kit
                                </button>
                                <button className="btn-secondary" onClick={() => setCurrentView(VIEWS.PRODUCTOS_VENDIDOS)}>
                                    Productos Más Vendidos
                                </button>
                            </div>
                        </div>

                        {error && <p className="error-message">{error}</p>}
                        {loading ? (
                            <p>Cargando inventario...</p>
                        ) : (
                            <>
                                <h2>Insumos y Materias Primas</h2>
                                {insumosFiltrados.length === 0 ? (
                                    <p>No hay insumos que coincidan con el filtro.</p>
                                ) : (
                                    <table className="inventario-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Código</th>
                                                <th>Categoría</th>
                                                <th>Cantidad</th>
                                                <th>Stock Mínimo</th>
                                                <th>Unidad</th>
                                                <th>Costo Compra</th>
                                                <th>Ganancia</th>
                                                <th>Costo Venta</th>
                                                <th>Proveedor</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {insumosFiltrados.map((insumo) => (
                                                <InsumoRow key={insumo.id} insumo={insumo} onEdit={handleEditInsumo} onDelete={handleDeleteInsumo} />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </>
                        )}

                        <h2>Kits Disponibles</h2>
                        {kits.length === 0 ? (
                            <p>No hay kits creados.</p>
                        ) : (
                            <table className="kits-table">
                                <thead>
                                    <tr>
                                        <th>Nombre Kit</th>
                                        <th>Costo Compra</th>
                                        <th>Precio Venta</th>
                                        <th>Ganancia</th>
                                        <th>Límite Prod.</th>
                                        <th>Componentes</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kits.map((kit) => (
                                        <tr key={kit.id}>
                                            <td>{kit.nombre}</td>
                                            <td>Bs. {kit.costoCompra != null ? formatMoney(kit.costoCompra) : '0.00'}</td>
                                            <td>Bs. {kit.precioVenta != null ? formatMoney(kit.precioVenta) : '0.00'}</td>
                                            <td>Bs. {kit.ganancia != null ? formatMoney(kit.ganancia) : '0.00'}</td>
                                            <td>
                                                {kit.maxKitsPosibles ?? 0} ({kit.insumoLimitante ?? 'N/A'})
                                            </td>
                                            <td>
                                                <ul>
                                                    {(kit.componentes ?? []).map((comp, idx) => (
                                                        <li key={idx}>
                                                            {comp.nombreInsumo ?? comp.insumoId} - {comp.cantidad ?? 0}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td>
                                                <button className="action-button edit-button" onClick={() => handleEditKit(kit.id)}>
                                                    Editar
                                                </button>
                                                <button className="action-button delete-button" onClick={() => handleDeleteKit(kit.id)}>
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                );
        }
    };

    return (
        <div className="inventario-container">
            <h1>Inventario y Producción</h1>
            {renderContent()}
        </div>
    );
}

export default Inventario;