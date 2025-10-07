import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Función para generar un código único de 6 caracteres
const generateClientCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Componente para agregar un nuevo cliente a la base de datos.
 *
 * @param {object} props - Propiedades del componente.
 * @param {function} props.onClienteAdded - Función de callback para volver a la lista después de agregar un cliente.
 * @param {function} props.onCancel - Función de callback para cancelar la adición y volver a la lista.
 */
function ClientesAdd({ onClienteAdded, onCancel }) {
  const [newCliente, setNewCliente] = useState({
    nombreCompleto: '',
    ci: '',
    telefono: '',
    instagram: '',
    descuento: 0,
    codigo: generateClientCode(),
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCliente(prevCliente => ({
      ...prevCliente,
      [name]: name === 'descuento' ? Number(value) : (name === 'nombreCompleto' ? value.toUpperCase() : value),
    }));
  };

  const validateForm = () => {
    const nameRegex = /^[A-Z\s]+$/;
    if (!newCliente.nombreCompleto || !nameRegex.test(newCliente.nombreCompleto)) {
      alert('El Nombre Completo es obligatorio y debe contener solo letras y espacios.');
      return false;
    }

    const ciRegex = /^\d+$/;
    if (!newCliente.ci || !ciRegex.test(newCliente.ci)) {
      alert('El Número de CI es obligatorio y debe contener solo números.');
      return false;
    }

    const phoneRegex = /^\d+$/;
    if (!newCliente.telefono || !phoneRegex.test(newCliente.telefono)) {
      alert('El Teléfono es obligatorio y debe contener solo números.');
      return false;
    }

    return true;
  };

  const handleAddCliente = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await addDoc(collection(db, 'clientes'), {
        ...newCliente,
        creadoEn: new Date(),
      });

      alert('Cliente creado exitosamente.');

      setNewCliente({
        nombreCompleto: '',
        ci: '',
        telefono: '',
        instagram: '',
        descuento: 0,
        codigo: generateClientCode(),
      });

      onClienteAdded();
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      alert('Error al agregar cliente: ' + error.message);
    }
  };

  return (
    <div className="form-page-container">
      <form className="cliente-form" onSubmit={handleAddCliente}>
        <h3>Crear Nuevo Cliente</h3>
        <p className="client-code">Código: <strong>{newCliente.codigo}</strong></p>
        <div className="form-group">
          <label htmlFor="nombreCompleto">Nombre Completo:</label>
          <input
            id="nombreCompleto"
            name="nombreCompleto"
            type="text"
            value={newCliente.nombreCompleto}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="ci">Número de CI:</label>
          <input
            id="ci"
            name="ci"
            type="text"
            value={newCliente.ci}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="telefono">Teléfono:</label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            value={newCliente.telefono}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="instagram">Instagram:</label>
          <input
            id="instagram"
            name="instagram"
            type="text"
            value={newCliente.instagram}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="descuento">Descuento (%):</label>
          <input
            id="descuento"
            name="descuento"
            type="number"
            value={newCliente.descuento}
            onChange={handleInputChange}
            min="0"
            max="100"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Guardar Cliente</button>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default ClientesAdd;