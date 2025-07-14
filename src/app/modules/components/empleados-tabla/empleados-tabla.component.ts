import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoRegistro } from '../empleados-formulario/empleados-formulario.component';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';

export interface RegistroNomina {
  id?: string;
  fecha: string;
  empleado: string;
  monto?: number;
  observaciones?: string;
  pagoRealizado?: boolean;
}

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

  // Registros de nómina
  registrosNomina: RegistroNomina[] = [];
  mostrarTablaNomina = false;

  // Modal de edición
  mostrarModalEdicion = false;
  registroEditando: EmpleadoRegistro | null = null;
  fechaEdit: string = '';
  empleadoEdit: string = '';
  turnoEdit: string = '';
  pagoEdit: boolean = false;

  // Modal de edición de nómina
  mostrarModalEdicionNomina = false;
  nominaEditando: RegistroNomina | null = null;
  fechaNominaEdit: string = '';
  empleadoNominaEdit: string = '';
  montoNominaEdit: number = 0;
  observacionesNominaEdit: string = '';
  pagoNominaEdit: boolean = false;

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
        // Cargar registros de empleados
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

        // Cargar registros de nómina
        const nominaRef = collection(this.firestore, 'nomina');
        const qNomina = query(nominaRef, orderBy('fecha', 'desc'));
        const nominaSnapshot = await getDocs(qNomina);
        const registrosNomina = nominaSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id
          } as RegistroNomina;
        });

        this.ngZone.run(() => {
          this.registros = registros;
          this.registrosNomina = registrosNomina;
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

  // Métodos para nómina
  onEditarNomina(registro: RegistroNomina) {
    this.nominaEditando = registro;
    this.fechaNominaEdit = registro.fecha;
    this.empleadoNominaEdit = registro.empleado;
    this.montoNominaEdit = registro.monto || 0;
    this.observacionesNominaEdit = registro.observaciones || '';
    this.pagoNominaEdit = registro.pagoRealizado || false;
    this.mostrarModalEdicionNomina = true;
  }

  async guardarEdicionNomina() {
    if (!this.fechaNominaEdit || !this.empleadoNominaEdit || !this.nominaEditando) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    if (!this.nominaEditando.id) {
      alert('ID no válido');
      return;
    }
    try {
      await this.ngZone.runOutsideAngular(async () => {
        if (this.nominaEditando && this.nominaEditando.id) {
          const datosActualizados = {
            fecha: this.fechaNominaEdit,
            empleado: this.empleadoNominaEdit,
            monto: this.montoNominaEdit,
            observaciones: this.observacionesNominaEdit,
            pagoRealizado: this.pagoNominaEdit
          };
          const docRef = doc(this.firestore, 'nomina', this.nominaEditando.id);
          await updateDoc(docRef, datosActualizados);
        }
      });
      await this.cargarRegistros();
      this.cerrarModalEdicionNomina();
      alert('Registro de nómina actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar registro de nómina:', error);
      alert('Error al actualizar el registro de nómina');
    }
  }

  cerrarModalEdicionNomina() {
    this.mostrarModalEdicionNomina = false;
    this.nominaEditando = null;
    this.fechaNominaEdit = '';
    this.empleadoNominaEdit = '';
    this.montoNominaEdit = 0;
    this.observacionesNominaEdit = '';
    this.pagoNominaEdit = false;
  }

  async onEliminarNomina(id: string | undefined) {
    if (!id) {
      alert('ID no válido');
      return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este registro de nómina?')) {
      try {
        await this.ngZone.runOutsideAngular(async () => {
          const docRef = doc(this.firestore, 'nomina', id);
          await deleteDoc(docRef);
        });
        await this.cargarRegistros();
      } catch (error) {
        console.error('Error al eliminar registro de nómina:', error);
        alert('Error al eliminar el registro de nómina');
      }
    }
  }

  // Métodos de estadísticas para nómina
  getTotalNominas(): number {
    return this.registrosNomina.length;
  }

  getNominasPagadas(): number {
    return this.registrosNomina.filter(registro => registro.pagoRealizado).length;
  }

  getNominasPendientes(): number {
    return this.registrosNomina.filter(registro => !registro.pagoRealizado).length;
  }

  getTotalMontoNominas(): number {
    return this.registrosNomina
      .filter(registro => registro.pagoRealizado && registro.monto)
      .reduce((total, registro) => total + (registro.monto || 0), 0);
  }

  getNominasPorEmpleado(empleado: string): number {
    return this.registrosNomina.filter(registro => registro.empleado === empleado).length;
  }

  getNominasPagadasPorEmpleado(empleado: string): number {
    return this.registrosNomina
      .filter(registro => registro.empleado === empleado && registro.pagoRealizado)
      .length;
  }

  getEmpleadosUnicosNomina(): string[] {
    return [...new Set(this.registrosNomina.map(registro => registro.empleado))];
  }
}
