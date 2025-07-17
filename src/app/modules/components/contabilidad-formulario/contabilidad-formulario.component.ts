import { Component, EventEmitter, Output, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, updateDoc, doc } from '@angular/fire/firestore';
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';

export interface ContabilidadRegistro {
  id?: string;
  fecha: string;
  ingreso: number;
  gastos: number;
  observaciones: string;
  total: number;
  fechaCreacion?: Date;
}

@Component({
  selector: 'app-contabilidad-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionModalComponent],
  templateUrl: './contabilidad-formulario.component.html',
  styleUrl: './contabilidad-formulario.component.scss'
})
export class ContabilidadFormularioComponent {
  @Output() nuevoRegistro = new EventEmitter<ContabilidadRegistro>();

  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  registro: ContabilidadRegistro = {
    fecha: '',
    ingreso: 0,
    gastos: 0,
    observaciones: '',
    total: 0
  };

  // Modal de confirmación
  mostrarModal = false;
  datosModal: ConfirmacionModalData = {
    titulo: 'Confirmar Registro Contable',
    mensaje: '¿Estás seguro de que quieres guardar este registro contable?',
    tipo: 'guardar'
  };

  async onSubmit() {
    if (this.registro.fecha && this.registro.observaciones) {
      // Calcular total para mostrar en el modal
      this.calcularTotal();

      // Actualizar mensaje del modal
      this.datosModal.mensaje = `¿Estás seguro de que quieres guardar este registro contable?\n\nFecha: ${this.registro.fecha}\nIngresos: $${this.registro.ingreso}\nGastos: $${this.registro.gastos}\nTotal: $${this.registro.total}`;

      // Mostrar modal de confirmación
      this.mostrarModal = true;
    } else {
      alert('Por favor complete todos los campos requeridos');
    }
  }

  async confirmarGuardado() {
    try {
      this.registro.fechaCreacion = new Date();

      let docRef: any;
      await this.ngZone.runOutsideAngular(async () => {
        docRef = await addDoc(collection(this.firestore, 'contabilidad'), this.registro);
      });

      const registroGuardado = {
        ...this.registro,
        id: docRef.id
      };

      this.nuevoRegistro.emit(registroGuardado);

      // Limpiar formulario
      this.registro = {
        fecha: '',
        ingreso: 0,
        gastos: 0,
        observaciones: '',
        total: 0
      };

      this.mostrarModal = false;
      alert('Registro de contabilidad guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar registro:', error);
      alert('Error al guardar el registro');
    }
  }

  cancelarGuardado() {
    this.mostrarModal = false;
  }

  calcularTotal() {
    this.registro.total = this.registro.ingreso - this.registro.gastos;
  }
}
