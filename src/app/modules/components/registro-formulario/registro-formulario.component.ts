import { Component, EventEmitter, Output, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';

export interface RegistroPerro {
  nombre: string;
  fecha: string;
  tamano: string;
  dias: number;
  diSol: boolean;
  bano: boolean;
  ingresos: number;
  gastos: number;
  total: number;
  metodoPago: string;
  fechaCreacion?: Date;
}

@Component({
  selector: 'app-registro-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionModalComponent],
  templateUrl: './registro-formulario.component.html',
  styleUrl: './registro-formulario.component.scss'
})
export class RegistroFormularioComponent {
  @Output() nuevoRegistro = new EventEmitter<RegistroPerro>();

  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  // Datos del formulario
  nombreMascota: string = '';
  fechaIngreso: string = '';
  tamanoPerro: string = '';
  diasAlojamiento: number = 0;
  servicioDiSol: boolean = false;
  servicioBano: boolean = false;
  gastos: number = 0;
  metodoPago: string = '';

  // Valores calculados
  ingresos: number = 0;
  total: number = 0;

  // Tarifas
  readonly tarifaDiSol = 25000;
  readonly tarifaBano = 50000;

  // Opciones de tamaño
  opcionesTamano = [
    { valor: '35000', texto: 'Pequeño (35 000 COP/día)' },
    { valor: '40000', texto: 'Mediano (40 000 COP/día)' },
    { valor: '45000', texto: 'Grande (45 000 COP/día)' }
  ];

  // Opciones de método de pago
  opcionesMetodoPago = [
    { valor: 'efectivo', texto: 'Efectivo' },
    { valor: 'transferencia', texto: 'Transferencia' },
    { valor: 'tarjeta', texto: 'Tarjeta de Crédito/Débito' }
  ];

  // Modal de confirmación
  mostrarModal = false;
  datosModal: ConfirmacionModalData = {
    titulo: 'Confirmar Registro',
    mensaje: '¿Estás seguro de que quieres guardar este registro?',
    tipo: 'guardar'
  };

  // Modal de validación
  mostrarModalValidacion = false;
  datosModalValidacion: ConfirmacionModalData = {
    titulo: 'Campos Requeridos',
    mensaje: 'Por favor complete todos los campos requeridos',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de éxito
  mostrarModalExito = false;
  datosModalExito: ConfirmacionModalData = {
    titulo: 'Éxito',
    mensaje: '',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de error
  mostrarModalError = false;
  datosModalError: ConfirmacionModalData = {
    titulo: 'Error',
    mensaje: '',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  actualizarIngresos() {
    // Verificar si el nombre es "chepe" o "ramon" (sin importar mayúsculas/minúsculas)
    const nombreLower = this.nombreMascota.toLowerCase().trim();
    if (nombreLower === 'chepe' || nombreLower === 'ramon') {
      this.ingresos = 0;
      this.calcularTotal();
      return;
    }

    const rateDia = parseFloat(this.tamanoPerro) || 0;
    const dias = this.diasAlojamiento || 0;
    const costoAloja = rateDia * dias;
    const costoDiSol = this.servicioDiSol ? this.tarifaDiSol : 0;
    const costoBano = this.servicioBano ? this.tarifaBano : 0;
    this.ingresos = costoAloja + costoDiSol + costoBano;
    this.calcularTotal();
  }

  calcularTotal() {
    this.total = this.ingresos + (this.gastos || 0);
  }

  async onSubmit() {
    if (!this.nombreMascota || !this.fechaIngreso || !this.tamanoPerro || !this.metodoPago) {
      this.mostrarModalValidacion = true;
      return;
    }

    // Mostrar modal de confirmación
    this.mostrarModal = true;
  }

  async confirmarGuardado() {
    const tamanoTexto = this.opcionesTamano.find(op => op.valor === this.tamanoPerro)?.texto || '';

    const registro: RegistroPerro = {
      nombre: this.nombreMascota,
      fecha: this.fechaIngreso,
      tamano: tamanoTexto,
      dias: this.diasAlojamiento,
      diSol: this.servicioDiSol,
      bano: this.servicioBano,
      ingresos: this.ingresos,
      gastos: this.gastos,
      total: this.total,
      metodoPago: this.metodoPago,
      fechaCreacion: new Date()
    };

    try {
      // Guardar en Firebase
      await this.ngZone.runOutsideAngular(async () => {
        const registrosRef = collection(this.firestore, 'registros');
        await addDoc(registrosRef, registro);
      });

      // Emitir evento para actualizar la tabla
      this.nuevoRegistro.emit(registro);
      this.resetForm();
      this.mostrarModal = false;

      this.datosModalExito.mensaje = 'Registro guardado exitosamente en Firebase';
      this.mostrarModalExito = true;
    } catch (error) {
      console.error('Error al guardar en Firebase:', error);
      this.mostrarModal = false;
      this.datosModalError.mensaje = 'Error al guardar el registro. Por favor intente nuevamente.';
      this.mostrarModalError = true;
    }
  }

  cancelarGuardado() {
    this.mostrarModal = false;
  }

  cerrarModalValidacion() {
    this.mostrarModalValidacion = false;
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
  }

  cerrarModalError() {
    this.mostrarModalError = false;
  }

  resetForm() {
    this.nombreMascota = '';
    this.fechaIngreso = '';
    this.tamanoPerro = '';
    this.diasAlojamiento = 0;
    this.servicioDiSol = false;
    this.servicioBano = false;
    this.gastos = 0;
    this.ingresos = 0;
    this.total = 0;
    this.metodoPago = '';
  }
}
