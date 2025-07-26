import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoRegistro } from '../empleados-formulario/empleados-formulario.component';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';

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
  imports: [CommonModule, FormsModule, ConfirmacionModalComponent],
  templateUrl: './empleados-tabla.component.html',
  styleUrl: './empleados-tabla.component.scss'
})
export class EmpleadosTablaComponent implements OnInit, AfterViewInit {
  // Registros de nómina
  registrosNomina: RegistroNomina[] = [];

  // Campo de búsqueda
  terminoBusqueda: string = '';

  // Modal de edición de nómina
  mostrarModalEdicionNomina = false;
  nominaEditando: RegistroNomina | null = null;
  fechaNominaEdit: string = '';
  empleadoNominaEdit: string = '';
  montoNominaEdit: number = 0;
  observacionesNominaEdit: string = '';
  pagoNominaEdit: boolean = false;

  // Modal de confirmación de eliminación
  mostrarModalEliminacion = false;
  nominaAEliminar: string | undefined;

  // Modal de validación
  mostrarModalValidacion = false;
  datosModalValidacion: ConfirmacionModalData = {
    titulo: 'Campos Requeridos',
    mensaje: 'Por favor complete todos los campos requeridos',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de error de ID
  mostrarModalErrorId = false;
  datosModalErrorId: ConfirmacionModalData = {
    titulo: 'ID Inválido',
    mensaje: 'ID no válido',
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

  // Modal de error de carga
  mostrarModalErrorCarga = false;
  datosModalErrorCarga: ConfirmacionModalData = {
    titulo: 'Error de Carga',
    mensaje: 'Error al cargar los registros desde Firebase',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

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
      this.mostrarModalErrorCarga = true;
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
      this.mostrarModalValidacion = true;
      return;
    }
    if (!this.nominaEditando.id) {
      this.mostrarModalErrorId = true;
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
      this.datosModalExito.mensaje = 'Registro de nómina actualizado exitosamente';
      this.mostrarModalExito = true;
    } catch (error) {
      console.error('Error al actualizar registro de nómina:', error);
      this.datosModalError.mensaje = 'Error al actualizar el registro de nómina';
      this.mostrarModalError = true;
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
      this.mostrarModalErrorId = true;
      return;
    }
    this.nominaAEliminar = id;
    this.mostrarModalEliminacion = true;
  }

  async confirmarEliminacion() {
    if (!this.nominaAEliminar) {
      this.mostrarModalEliminacion = false;
      return;
    }
    try {
      await this.ngZone.runOutsideAngular(async () => {
        const docRef = doc(this.firestore, 'nomina', this.nominaAEliminar!);
        await deleteDoc(docRef);
      });
      await this.cargarRegistros();
      this.mostrarModalEliminacion = false;
      this.nominaAEliminar = undefined;
    } catch (error) {
      console.error('Error al eliminar registro de nómina:', error);
      this.mostrarModalEliminacion = false;
      this.datosModalError.mensaje = 'Error al eliminar el registro de nómina';
      this.mostrarModalError = true;
    }
  }

  cancelarEliminacion() {
    this.mostrarModalEliminacion = false;
    this.nominaAEliminar = undefined;
  }

  cerrarModalValidacion() {
    this.mostrarModalValidacion = false;
  }

  cerrarModalErrorId() {
    this.mostrarModalErrorId = false;
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
  }

  cerrarModalError() {
    this.mostrarModalError = false;
  }

  cerrarModalErrorCarga() {
    this.mostrarModalErrorCarga = false;
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

  // Getter para filtrar registros
  get registrosFiltrados(): RegistroNomina[] {
    if (!this.terminoBusqueda.trim()) {
      return this.registrosNomina;
    }
    
    const termino = this.terminoBusqueda.toLowerCase().trim();
    return this.registrosNomina.filter(registro => 
      registro.empleado.toLowerCase().includes(termino) ||
      registro.fecha.toLowerCase().includes(termino) ||
      (registro.observaciones && registro.observaciones.toLowerCase().includes(termino)) ||
      (registro.monto && registro.monto.toString().includes(termino))
    );
  }
}
