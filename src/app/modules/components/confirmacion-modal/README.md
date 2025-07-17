# Modal de Confirmación

Este componente proporciona un modal de confirmación reutilizable para toda la aplicación.

## Características

- ✅ Diseño moderno y responsive
- ✅ Animaciones suaves
- ✅ Diferentes tipos de confirmación (guardar, editar, eliminar, confirmar)
- ✅ Colores automáticos según el tipo de acción
- ✅ Textos personalizables
- ✅ Accesibilidad mejorada

## Uso Básico

### 1. Importar el componente

```typescript
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';
```

### 2. Agregar a los imports del componente

```typescript
@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionModalComponent],
  // ...
})
```

### 3. Agregar propiedades al componente

```typescript
// Modal de confirmación
mostrarModal = false;
datosModal: ConfirmacionModalData = {
  titulo: 'Confirmar Acción',
  mensaje: '¿Estás seguro de que quieres realizar esta acción?',
  tipo: 'guardar' // 'guardar' | 'editar' | 'eliminar' | 'confirmar'
};
```

### 4. Agregar métodos de control

```typescript
async onSubmit() {
  // Validaciones...
  
  // Mostrar modal de confirmación
  this.mostrarModal = true;
}

async confirmarAccion() {
  try {
    // Lógica de guardado/eliminación
    await this.guardarDatos();
    
    this.mostrarModal = false;
    alert('Operación exitosa');
  } catch (error) {
    alert('Error en la operación');
  }
}

cancelarAccion() {
  this.mostrarModal = false;
}
```

### 5. Agregar el modal al template

```html
<!-- Modal de confirmación -->
<app-confirmacion-modal
  [mostrar]="mostrarModal"
  [datos]="datosModal"
  (confirmar)="confirmarAccion()"
  (cancelar)="cancelarAccion()"
  (cerrar)="cancelarAccion()">
</app-confirmacion-modal>
```

## Tipos de Modal

### Guardar (verde)
```typescript
datosModal = {
  titulo: 'Confirmar Guardado',
  mensaje: '¿Estás seguro de que quieres guardar este registro?',
  tipo: 'guardar'
};
```

### Editar (amarillo)
```typescript
datosModal = {
  titulo: 'Confirmar Edición',
  mensaje: '¿Estás seguro de que quieres editar este registro?',
  tipo: 'editar'
};
```

### Eliminar (rojo)
```typescript
datosModal = {
  titulo: 'Confirmar Eliminación',
  mensaje: '¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.',
  tipo: 'eliminar'
};
```

### Confirmar (azul)
```typescript
datosModal = {
  titulo: 'Confirmar Acción',
  mensaje: '¿Estás seguro de que quieres continuar?',
  tipo: 'confirmar'
};
```

## Personalización de Textos

Puedes personalizar los textos de los botones:

```typescript
datosModal = {
  titulo: 'Confirmar Acción',
  mensaje: '¿Estás seguro?',
  tipo: 'eliminar',
  textoBotonConfirmar: 'Sí, eliminar',
  textoBotonCancelar: 'No, cancelar'
};
```

## Eventos

- `(confirmar)`: Se ejecuta cuando el usuario hace clic en el botón de confirmar
- `(cancelar)`: Se ejecuta cuando el usuario hace clic en el botón de cancelar
- `(cerrar)`: Se ejecuta cuando el usuario hace clic en la X o fuera del modal

## Ejemplos Implementados

### Registro de Perros
- Ubicación: `registro-formulario.component.ts`
- Tipo: `guardar`
- Confirma antes de guardar un nuevo registro de perro

### Empleados
- Ubicación: `empleados-formulario.component.ts`
- Tipo: `guardar`
- Confirma antes de agregar registros de nómina

### Contabilidad
- Ubicación: `contabilidad-formulario.component.ts`
- Tipo: `guardar`
- Muestra detalles del registro antes de confirmar

## Estilos

El modal incluye:
- Fondo con blur
- Animaciones de entrada y salida
- Diseño responsive
- Colores automáticos según el tipo
- Hover effects en botones
- Focus states para accesibilidad 
