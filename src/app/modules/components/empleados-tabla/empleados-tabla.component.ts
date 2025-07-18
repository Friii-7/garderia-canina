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
  // Registros de nómina
  registrosNomina: RegistroNomina[] = [];



  // Modal de edición de nómina
  mostrarModalEdicionNomina = false;
  nominaEditando: RegistroNomina | null = null;
  fechaNominaEdit: string = '';
  empleadoNominaEdit: string = '';
  montoNominaEdit: number = 0;
  observacionesNominaEdit: string = '';
  pagoNominaEdit: boolean = false;

  empleados = ['Farzin', 'Saul', 'Evelyn'];

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

  // Métodos para calcular pagos pendientes
  getTotalPagoPendiente(): number {
    return this.registrosNomina
      .filter(registro => !registro.pagoRealizado && registro.monto)
      .reduce((total, registro) => total + (registro.monto || 0), 0);
  }

  getPagoPendientePorEmpleado(empleado: string): number {
    return this.registrosNomina
      .filter(registro => registro.empleado === empleado && !registro.pagoRealizado && registro.monto)
      .reduce((total, registro) => total + (registro.monto || 0), 0);
  }

  getNominasPendientesPorEmpleado(empleado: string): number {
    return this.registrosNomina
      .filter(registro => registro.empleado === empleado && !registro.pagoRealizado)
      .length;
  }
}
