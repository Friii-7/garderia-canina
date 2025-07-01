import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoRegistro } from '../empleados-formulario/empleados-formulario.component';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-empleados-tabla',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleados-tabla.component.html',
  styleUrl: './empleados-tabla.component.scss'
})
export class EmpleadosTablaComponent implements OnInit, AfterViewInit {
  @Input() registros: EmpleadoRegistro[] = [];
  @Output() editarRegistro = new EventEmitter<EmpleadoRegistro>();
  @Output() eliminarRegistro = new EventEmitter<string>();

  // Modal de edición
  mostrarModalEdicion = false;
  registroEditando: EmpleadoRegistro | null = null;
  fechaEdit: string = '';
  empleadoEdit: string = '';
  turnoEdit: string = '';
  pagoEdit: boolean = false;

  empleados = ['Farzin', 'Saul', 'Evelyn'];
  turnos = ['Día', 'Noche'];

  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  ngOnInit() {
    // Component initialization
  }

  ngAfterViewInit() {
    // Load data after view is initialized to avoid injection context warnings
    this.cargarRegistros();
  }

  async cargarRegistros() {
    try {
      await this.ngZone.runOutsideAngular(async () => {
        const registrosRef = collection(this.firestore, 'empleados');
        const q = query(registrosRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        const registros = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id
          } as EmpleadoRegistro;
        });

        this.ngZone.run(() => {
          this.registros = registros;
        });
      });
    } catch (error) {
      console.error('Error al cargar registros:', error);
      alert('Error al cargar los registros desde Firebase');
    }
  }

  async actualizarTabla() {
    await this.cargarRegistros();
  }

  onEditar(registro: EmpleadoRegistro) {
    this.registroEditando = registro;
    this.fechaEdit = registro.fecha;
    this.empleadoEdit = registro.empleado;
    this.turnoEdit = registro.turno;
    this.pagoEdit = registro.pago;
    this.mostrarModalEdicion = true;
  }

  async guardarEdicion() {
    if (!this.fechaEdit || !this.empleadoEdit || !this.turnoEdit || !this.registroEditando) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    if (!this.registroEditando.id) {
      alert('ID no válido');
      return;
    }
    try {
      await this.ngZone.runOutsideAngular(async () => {
        if (this.registroEditando && this.registroEditando.id) {
          const datosActualizados = {
            fecha: this.fechaEdit,
            empleado: this.empleadoEdit,
            turno: this.turnoEdit,
            pago: this.pagoEdit
          };
          const docRef = doc(this.firestore, 'empleados', this.registroEditando.id);
          await updateDoc(docRef, datosActualizados);
        }
      });
      await this.cargarRegistros();
      this.cerrarModalEdicion();
      alert('Registro actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar registro:', error);
      alert('Error al actualizar el registro');
    }
  }

  cerrarModalEdicion() {
    this.mostrarModalEdicion = false;
    this.registroEditando = null;
    this.fechaEdit = '';
    this.empleadoEdit = '';
    this.turnoEdit = '';
    this.pagoEdit = false;
  }

  async onEliminar(id: string | undefined) {
    if (!id) {
      alert('ID no válido');
      return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      try {
        await this.ngZone.runOutsideAngular(async () => {
          const docRef = doc(this.firestore, 'empleados', id);
          await deleteDoc(docRef);
        });
        await this.cargarRegistros();
      } catch (error) {
        console.error('Error al eliminar registro:', error);
        alert('Error al eliminar el registro');
      }
    }
  }

  getTotalPagos(): number {
    return this.registros.filter(registro => registro.pago).length;
  }

  getPagosPorEmpleado(empleado: string): number {
    return this.registros
      .filter(registro => registro.empleado === empleado && registro.pago)
      .length;
  }

  getEmpleadosUnicos(): string[] {
    return [...new Set(this.registros.map(registro => registro.empleado))];
  }

  getPagosPorTurno(turno: string): number {
    return this.registros
      .filter(registro => registro.turno === turno && registro.pago)
      .length;
  }

  getTotalRegistros(): number {
    return this.registros.length;
  }

  getRegistrosPorEmpleado(empleado: string): number {
    return this.registros.filter(registro => registro.empleado === empleado).length;
  }
}
