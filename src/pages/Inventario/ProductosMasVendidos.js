import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import './ProductosMasVendidos.css';
// Asumiendo que el CSS lo pones en el mismo archivo Inventario.css o creas uno nuevo
// import './ProductosMasVendidos.css'; 

function ProductosMasVendidos({ userId, onCancel }) { // Añadimos onCancel para volver
    const [productosVendidos, setProductosVendidos] = useState({});
    const [kitsVendidos, setKitsVendidos] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) {
            setError('No hay usuario autenticado.');
            setLoading(false);
            return;
        }

        // Consulta la colección de ventas del usuario
        const ventasQuery = query(
            collection(db, 'ventas'),
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(ventasQuery, 
            (querySnapshot) => {
                const ventasData = querySnapshot.docs.map(doc => doc.data());
                
                let prodCount = {};
                let kitCount = {};

                ventasData.forEach(venta => {
                    // Procesar Artículos Individuales y Kits
                    if (venta.articulos) {
                        venta.articulos.forEach(item => {
                            // Usamos el nombre y el tipo para agrupar
                            const nombre = item.nombre || 'Desconocido';
                            
                            if (item.tipo === 'producto') {
                                prodCount[nombre] = (prodCount[nombre] || 0) + item.cantidad;
                            } else if (item.tipo === 'kit') {
                                kitCount[nombre] = (kitCount[nombre] || 0) + item.cantidad;
                            }
                        });
                    }
                });

                setProductosVendidos(prodCount);
                setKitsVendidos(kitCount);
                setLoading(false);
            },
            (err) => {
                console.error('Error al cargar ventas:', err);
                setError('Error al cargar el historial de ventas: ' + err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    const formatData = (data) => {
        // Convierte el objeto a un array de {nombre, cantidad} y lo ordena de mayor a menor.
        return Object.entries(data)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);
    };

    const productosOrdenados = formatData(productosVendidos);
    const kitsOrdenados = formatData(kitsVendidos);
    
    // Función de renderizado para la tabla
    const renderTable = (data, tipo) => (
        data.length > 0 ? (
            <table className="ventas-report-table">
                <thead>
                    <tr>
                        <th>{tipo}</th>
                        <th>Cantidad Vendida</th>
                        <th>Decisión de Stock</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={index}>
                            <td>{item.nombre}</td>
                            <td className="quantity-cell">{item.cantidad}</td>
                            <td>
                                {item.cantidad > 50 ? 
                                    <span className="stock-decision high">⬆️ Comprar/Producir MÁS</span> : 
                                    item.cantidad < 10 ? 
                                    <span className="stock-decision low">⬇️ Considerar Quitar</span> :
                                    <span className="stock-decision normal">🆗 Stock Normal</span>
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : (
            <p>No hay {tipo.toLowerCase()} vendidos registrados.</p>
        )
    );

    if (loading) {
        return <div className="loading-message">Cargando datos de ventas...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="ventas-report-container">
            <h2>📊 Productos y Kits Más Vendidos</h2>
            <p className="report-subtitle">
                Análisis de las ventas totales para optimizar las compras y la producción.
            </p>

            <div className="report-sections-wrapper">
                {/* Sección de Productos Individuales */}
                <div className="report-section product-section">
                    <h3>Productos Individuales</h3>
                    {renderTable(productosOrdenados, 'Producto')}
                </div>

                {/* Sección de Kits */}
                <div className="report-section kit-section">
                    <h3>Kits Vendidos</h3>
                    {renderTable(kitsOrdenados, 'Kit')}
                </div>
            </div>

            <button className="back-button" onClick={onCancel}>Volver al Inventario</button>
        </div>
    );
}

export default ProductosMasVendidos;