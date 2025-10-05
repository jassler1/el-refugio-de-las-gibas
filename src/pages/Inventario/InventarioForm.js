import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './InventarioForm.css';

const unidadesMedida = ['KG', 'GR', 'LTS', 'UNIDAD', 'ML'];
const NUEVA_CATEGORIA_VALOR = '___NUEVA_CATEGORIA___';

const normalizeCategoryName = (name) => {
    if (!name) return '';
    return name.trim().toUpperCase();
};

// ====================================
// Custom Hook para la Lógica del Formulario
// ====================================
const useFormState = (initialData, uniqueCategories) => {
    // Función para determinar la categoría inicial
    const getInitialCategory = useCallback(() => {
        if (initialData && initialData.categoria) {
            return normalizeCategoryName(initialData.categoria);
        }
        return uniqueCategories.length > 0 ? uniqueCategories[0] : '';
    }, [initialData, uniqueCategories]);

    const [form, setForm] = useState(() => ({
        nombre: '',
        categoria: getInitialCategory(), // Usar la función para el estado inicial
        cantidad: '',
        stockMinimo: '',
        unidadMedida: unidadesMedida[0],
        costoCompra: '',
        ganancia: '',
        precioVenta: '',
        proveedor: '',
        sinPrecioVenta: false,
    }));

    // Ref para rastrear si el usuario ha modificado el precio de venta manualmente
    const precioVentaManualRef = useRef(false);

    // Efecto para cargar datos iniciales si se está editando
    useEffect(() => {
        if (initialData) {
            setForm({
                id: initialData.id, // Incluir ID para la actualización
                nombre: initialData.nombre || '',
                categoria: normalizeCategoryName(initialData.categoria) || (uniqueCategories[0] || ''),
                cantidad: initialData.cantidad?.toString() || '',
                stockMinimo: initialData.stockMinimo?.toString() || '',
                unidadMedida: initialData.unidadMedida || unidadesMedida[0],
                costoCompra: initialData.costoCompra?.toString() || '',
                // La ganancia se almacena como decimal (ej. 0.25) en DB, se muestra como porcentaje (ej. 25)
                ganancia: initialData.ganancia != null ? (initialData.ganancia * 100).toString() : '', 
                precioVenta: initialData.costoVenta != null ? initialData.costoVenta?.toString() : '',
                proveedor: initialData.proveedor || '',
                sinPrecioVenta: initialData.sinPrecioVenta || false,
            });
            // Determinar si el precio de venta es manual
            precioVentaManualRef.current = initialData.sinPrecioVenta ? false : (initialData.costoVenta !== undefined && initialData.costoVenta !== null);
        } else if (form.categoria === '' && uniqueCategories.length > 0) {
            // Inicializar categoría si no hay initialData y la lista se carga después
            setForm(prev => ({ ...prev, categoria: uniqueCategories[0] }));
        }
    }, [initialData, uniqueCategories, getInitialCategory]);

    // Efecto para recalcular el Precio de Venta (automático)
    useEffect(() => {
        const costoCompraNum = parseFloat(form.costoCompra);
        const gananciaNum = parseFloat(form.ganancia); // En porcentaje

        // Recalcular SOLO si no está marcada la casilla 'sinPrecioVenta' y no es manual
        if (!form.sinPrecioVenta && !precioVentaManualRef.current && !isNaN(costoCompraNum) && !isNaN(gananciaNum)) {
            const nuevoPrecio = (costoCompraNum * (1 + gananciaNum / 100));
            setForm((prev) => ({
                ...prev,
                precioVenta: nuevoPrecio.toFixed(2),
            }));
        }
    }, [form.costoCompra, form.ganancia, form.sinPrecioVenta]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            setForm((prev) => {
                if (name === 'sinPrecioVenta' && checked) {
                    precioVentaManualRef.current = false; // Desactiva el cálculo automático/manual si no hay precio de venta
                    // Además, limpiamos campos relacionados para consistencia visual
                    return { ...prev, [name]: checked, ganancia: '', precioVenta: '' };
                }
                return { ...prev, [name]: checked };
            });
            return;
        }

        // Lógica para determinar si el precio de venta es manual
        if (name === 'precioVenta') {
            precioVentaManualRef.current = true;
        } else if ((name === 'costoCompra' || name === 'ganancia')) {
            // Si el costo o la ganancia cambian, el precio de venta vuelve a ser automático
            // A menos que esté marcado 'sinPrecioVenta'
            if (!form.sinPrecioVenta) {
                precioVentaManualRef.current = false;
            }
        }

        // Siempre manejar el nombre en mayúsculas
        if (name === 'nombre') {
            setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
            return;
        }

        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setForm({
            nombre: '',
            categoria: uniqueCategories[0] || '',
            cantidad: '',
            stockMinimo: '',
            unidadMedida: unidadesMedida[0],
            costoCompra: '',
            ganancia: '',
            precioVenta: '',
            proveedor: '',
            sinPrecioVenta: false,
        });
        precioVentaManualRef.current = false;
    };

    return { form, handleChange, resetForm };
};

// ====================================
// Componente Principal
// ====================================
function InventarioForm({ onSave, initialData = null, onCancel, insumos = [] }) {
    // 💡 IMPORTANTE: La prop 'onAdd' se ha renombrado a 'onSave' para ser coherente con Inventario.js

    const currentUniqueCategories = useMemo(() => {
        return [
            ...new Set(insumos.map(i => normalizeCategoryName(i.categoria)).filter(Boolean))
        ].sort();
    }, [insumos]);

    // Usamos el estado local para gestionar las categorías nuevas que el usuario añade temporalmente
    const [availableCategories, setAvailableCategories] = useState(currentUniqueCategories);
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const { form, handleChange, resetForm } = useFormState(initialData, availableCategories);

    // Sincronizar categorías si la lista de insumos se actualiza (por ejemplo, después de guardar)
    useEffect(() => {
        const mergedCategories = [...new Set([...currentUniqueCategories, ...availableCategories])].sort();
        if (JSON.stringify(availableCategories) !== JSON.stringify(mergedCategories)) {
            setAvailableCategories(mergedCategories);
        }
    }, [currentUniqueCategories, availableCategories]);

    const handleCategorySelectChange = (e) => {
        const { value } = e.target;

        if (value === NUEVA_CATEGORIA_VALOR) {
            setShowNewCategoryInput(true);
            // Esto asegura que el campo de categoría no tenga el valor especial en el formulario
            handleChange({ target: { name: 'categoria', value: '' } });
        } else {
            setShowNewCategoryInput(false);
            handleChange(e);
        }
    };

    const handleAddNewCategory = () => {
        const name = newCategoryName.trim();
        if (name) {
            const normalizedName = normalizeCategoryName(name);

            if (availableCategories.includes(normalizedName)) {
                alert(`La categoría "${normalizedName}" ya existe.`);
                return;
            }

            // Agrega y selecciona la nueva categoría
            setAvailableCategories(prev => [...prev, normalizedName].sort());
            handleChange({ target: { name: 'categoria', value: normalizedName } });
            setNewCategoryName('');
            setShowNewCategoryInput(false);
        } else {
            alert('Por favor, ingresa un nombre válido para la categoría.');
        }
    };

    const handleDeleteCategory = (categoryToDelete) => {
        const isCategoryUsed = insumos.some(insumo => normalizeCategoryName(insumo.categoria) === categoryToDelete);

        if (isCategoryUsed) {
            alert(`No se puede eliminar la categoría "${categoryToDelete}" porque está asignada a uno o más insumos. Primero debes reasignar o eliminar esos insumos.`);
            return;
        }

        if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryToDelete}"?`)) {
            const remainingCategories = availableCategories.filter(cat => cat !== categoryToDelete);
            setAvailableCategories(remainingCategories);

            if (form.categoria === categoryToDelete) {
                // Selecciona la primera categoría disponible o vacía
                handleChange({ target: { name: 'categoria', value: remainingCategories[0] || '' } });
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validateField = (value, name) => {
            const num = parseFloat(value);
            // Permitimos que algunos campos de texto sean opcionales (ej: proveedor), 
            // pero si son numéricos, deben ser >= 0.
            if (value.trim() !== '' && (isNaN(num) || num < 0)) {
                alert(`${name} debe ser un número positivo.`);
                return false;
            }
            return true;
        };

        if (!form.nombre.trim()) { alert('El nombre es obligatorio'); return; }
        if (!form.categoria.trim()) { alert('Debes seleccionar o crear una categoría.'); return; }
        
        // Validación de campos obligatorios
        if (!form.cantidad.trim() && !initialData) { alert('La Cantidad (Stock inicial) es obligatoria al crear.'); return; }
        if (!form.stockMinimo.trim()) { alert('El Stock mínimo es obligatorio.'); return; }
        if (!form.costoCompra.trim()) { alert('El Costo de compra es obligatorio.'); return; }

        // Validación de formato numérico
        if (!validateField(form.cantidad, 'Cantidad') ||
            !validateField(form.stockMinimo, 'Stock mínimo') ||
            !validateField(form.costoCompra, 'Costo de compra')) {
            return;
        }

        if (!form.sinPrecioVenta) {
            if (!form.ganancia.trim()) { alert('La Ganancia es obligatoria si no es un insumo sin precio de venta.'); return; }
            if (!form.precioVenta.trim()) { alert('El Precio de venta es obligatorio si no es un insumo sin precio de venta.'); return; }

            if (!validateField(form.ganancia, 'Ganancia') || !validateField(form.precioVenta, 'Precio de venta')) {
                return;
            }
        }

        const insumoData = {
            ...form,
            nombre: form.nombre.toUpperCase(),
            categoria: normalizeCategoryName(form.categoria),
            // Convertir a float solo si el valor existe, si no, usar 0 (o null) para consistencia en DB
            cantidad: form.cantidad.trim() ? parseFloat(form.cantidad) : (initialData ? initialData.cantidad : 0),
            stockMinimo: parseFloat(form.stockMinimo),
            costoCompra: parseFloat(form.costoCompra),
            // La ganancia y costoVenta se guardan como 0/null si sinPrecioVenta es true
            ganancia: form.sinPrecioVenta ? null : parseFloat(form.ganancia) / 100, // DB almacena decimal (0.25)
            costoVenta: form.sinPrecioVenta ? null : parseFloat(form.precioVenta),
            // Añadir ID solo si estamos editando
            ...(initialData?.id ? { id: initialData.id } : {}) 
        };

        try {
            // 💡 LLAMAR A ON_SAVE
            onSave(insumoData);
            if (!initialData) resetForm();
        } catch (err) {
            alert(`Error al guardar insumo: ${err.message}`);
            console.error('Error al guardar insumo:', err);
        }
    };

    return (
        <div className="form-page-container">
            <form onSubmit={handleSubmit} className="inventario-form">
                <h3>{initialData ? 'Editar Insumo' : 'Agregar Nuevo Insumo'}</h3>
                
                {/* Nombre */}
                <input
                    name="nombre"
                    placeholder="Nombre del producto (MAYÚSCULAS)"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                />
                
                {/* Categoría y Control */}
                <div className="category-control-group">
                    <select
                        name="categoria"
                        value={form.categoria}
                        onChange={handleCategorySelectChange}
                        required
                    >
                        <option value="" disabled>--- SELECCIONAR CATEGORÍA ---</option>
                        {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value={NUEVA_CATEGORIA_VALOR}>+ AÑADIR NUEVA CATEGORÍA</option>
                    </select>

                    {form.categoria && form.categoria !== NUEVA_CATEGORIA_VALOR && !showNewCategoryInput && (
                        <button
                            type="button"
                            className="btn-delete-category"
                            onClick={() => handleDeleteCategory(form.categoria)}
                            title={`Eliminar categoría ${form.categoria}`}
                        >
                            🗑️
                        </button>
                    )}
                </div>

                {/* Input para Nueva Categoría */}
                {showNewCategoryInput && (
                    <div className="new-category-input-group">
                        <input
                            type="text"
                            placeholder="Nombre de la nueva CATEGORÍA"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            required
                        />
                        <button type="button" onClick={handleAddNewCategory} className="btn-add-category">
                            Añadir
                        </button>
                    </div>
                )}

                {/* Cantidad y Unidad */}
                <div className="form-row-group">
                    <input
                        name="cantidad"
                        placeholder="Cantidad (Stock inicial)"
                        value={form.cantidad}
                        onChange={handleChange}
                        type="number"
                        min="0"
                        step="any"
                        className="half-input"
                        required={!initialData} // Requerido al crear, opcional al editar
                    />
                    <select name="unidadMedida" value={form.unidadMedida} onChange={handleChange} className="half-input">
                        {unidadesMedida.map(unid => (
                            <option key={unid} value={unid}>{unid}</option>
                        ))}
                    </select>
                </div>

                {/* Stock Mínimo */}
                <input
                    name="stockMinimo"
                    placeholder="Stock mínimo para alerta"
                    value={form.stockMinimo}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    step="any"
                />

                {/* Proveedor */}
                <input
                    name="proveedor"
                    placeholder="Proveedor (Opcional)"
                    value={form.proveedor}
                    onChange={handleChange}
                />

                {/* Checkbox Sin Precio Venta */}
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="sinPrecioVenta"
                        checked={form.sinPrecioVenta}
                        onChange={handleChange}
                    />
                    Insumo sin precio de venta (no se vende)
                </label>

                <h4 className="section-separator">Precios y Ganancia</h4>

                {/* Costo de Compra */}
                <div className="input-with-symbol">
                    <span className="symbol-prefix">Bs.</span>
                    <input
                        name="costoCompra"
                        placeholder="Costo de compra"
                        value={form.costoCompra}
                        onChange={handleChange}
                        type="number"
                        min="0"
                        step="any"
                        required
                    />
                </div>

                {/* Ganancia */}
                <div className="input-with-symbol" style={{ opacity: form.sinPrecioVenta ? 0.6 : 1 }}>
                    <input
                        name="ganancia"
                        placeholder="Ganancia"
                        value={form.ganancia}
                        onChange={handleChange}
                        type="number"
                        min="0"
                        step="any"
                        disabled={form.sinPrecioVenta}
                        required={!form.sinPrecioVenta}
                    />
                    <span className="symbol-suffix">%</span>
                </div>

                {/* Precio de Venta (Solo visible si no es 'sin precio de venta') */}
                {!form.sinPrecioVenta && (
                    <div className="input-with-symbol">
                        <span className="symbol-prefix">Bs.</span>
                        <input
                            name="precioVenta"
                            placeholder="Precio de venta"
                            value={form.precioVenta}
                            onChange={handleChange}
                            type="number"
                            min="0"
                            step="any"
                            required
                        />
                    </div>
                )}

                <div className="form-buttons">
                    <button type="submit" className="btn-primary">{initialData ? 'Guardar cambios' : 'Agregar insumo'}</button>
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
    );
}

export default InventarioForm;