import React from 'react';
import './Home.css';

/**
 * Componente de la página de inicio que muestra un mensaje de bienvenida
 * y alertas de stock bajo.
 * @param {object} props - Propiedades del componente.
 * @param {Array<object>} props.insumos - La lista de insumos del inventario.
 */
function Home({ insumos = [] }) {
  // Filtra los insumos que están por debajo de su stock mínimo
  const alertasStockBajo = insumos.filter(insumo => 
    insumo.cantidad <= insumo.stockMinimo
  );

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2>¡Bienvenido al sistema de El Refugio de las Gibas!</h2>
        <p>Selecciona una opción del menú lateral para comenzar a gestionar tu inventario.</p>
      </div>

      {/* Sección de alertas de stock */}
      <div className="alerts-section">
        <h3>Alertas de Stock</h3>
        {alertasStockBajo.length > 0 ? (
          <ul className="alerts-list">
            {alertasStockBajo.map(insumo => (
              <li key={insumo.id} className="alert-item low-stock">
                🚨 El stock de **{insumo.nombre}** ({insumo.unidadMedida}) es bajo: {insumo.cantidad}
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-alerts">
            <span role="img" aria-label="emoji de pulgar arriba">👍</span> No hay alertas de stock en este momento.
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;