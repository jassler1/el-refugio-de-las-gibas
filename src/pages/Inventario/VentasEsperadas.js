// VentasEsperadas.js
import React from 'react';
import './VentasEsperadas.css';

function VentasEsperadas({ insumos }) {
  // Inicializar el Ingreso Total Esperado (Venta Total)
  let ventaTotalEsperada = 0;
  
  // Mapear los insumos/kits para calcular el ingreso individual
  const listaProductos = insumos.map(item => {
    // Determinar el precio de venta. Si es un Kit, usa 'precioVenta', si es Insumo, usa 'costoVenta'.
    // Asumimos que los Kits tienen un campo 'precioVenta' y los Insumos tienen 'costoVenta'.
    const precio = parseFloat(item.precioVenta || item.costoVenta) || 0;
    const cantidad = parseFloat(item.cantidad) || 0;

    // Calcular la Venta Individual (Ingreso Bruto)
    const ventaIndividual = precio * cantidad;
    
    // Sumar al Ingreso Total
    ventaTotalEsperada += ventaIndividual;

    return {
      // Usa 'nombre' para Kits e Insumos
      nombre: item.nombre,
      ingreso: ventaIndividual, // Este es el ingreso bruto individual
      cantidad: cantidad,
      precioVenta: precio,
      // Agregamos una etiqueta para diferenciar visualmente los Kits de los Insumos
      tipo: item.componentes ? 'Kit' : 'Insumo', 
    };
  });

  // Filtra aquellos que no tienen precio de venta para no incluirlos en el detalle
  const productosConPrecio = listaProductos.filter(item => item.precioVenta > 0);

  return (
    <div className="expected-sales-container">
      <div className="header-section">
        <h3 className="title">Venta Total Esperada (Ingresos Brutos)</h3>
        <p className="description">
          Esta es la suma de los ingresos brutos si vendes todo el stock actual de tus productos y kits:
        </p>
        <div className="total-amount total-income">
          <span>Bs.</span> {ventaTotalEsperada.toFixed(2)}
        </div>
      </div>

      <hr className="separator" />

      <div className="details-section">
        <h4 className="section-title">Detalle de Ventas Esperadas por Ítem</h4>
        {productosConPrecio.length === 0 ? (
          <p className="no-data">No hay productos o kits con un precio de venta definido.</p>
        ) : (
          <ul className="product-list">
            {productosConPrecio.map((item, index) => (
              <li key={index} className={`product-item ${item.tipo.toLowerCase()}`}>
                <div className="product-details">
                  <span className="product-name">{item.nombre}</span>
                  <span className={`item-type-tag ${item.tipo.toLowerCase()}`}>{item.tipo}</span>
                  <span className="product-info">
                    ({item.cantidad} x Bs. {item.precioVenta.toFixed(2)})
                  </span>
                </div>
                <div className="product-profit product-ingreso">
                  Bs. {item.ingreso.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default VentasEsperadas;