import { Component, EventEmitter, Output, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

export interface EmpleadoRegistro {
  id?: string;
  fecha: string;
  empleado: string;
  turno: string;
  pago: boolean;
}

@Component({
  selector: 'app-empleados-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleados-formulario.component.html',
  styleUrl: './empleados-formulario.component.scss'
})
export class EmpleadosFormularioComponent {
  @Output() registroGuardado = new EventEmitter<void>();

  empleados = ['Farzin', 'Saul', 'Evelyn'];
  turnos = ['Día', 'Noche'];

  registro: EmpleadoRegistro = {
    fecha: '',
    empleado: '',
    turno: '',
    pago: false
  };

  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  async onSubmit() {
    if (this.registro.fecha && this.registro.empleado && this.registro.turno) {
      try {
        await this.ngZone.runOutsideAngular(async () => {
          await addDoc(collection(this.firestore, 'empleados'), this.registro);
        });
        this.registroGuardado.emit();
        // Limpiar formulario
        this.registro = {
          fecha: '',
          empleado: '',
          turno: '',
          pago: false
        };
        alert('Registro de empleado guardado exitosamente');
      } catch (error) {
        alert('Error al guardar el registro');
      }
    }
  }
}
