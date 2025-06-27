import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContabilidadRegistro } from '../contabilidad-formulario/contabilidad-formulario.component';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-contabilidad-tabla',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contabilidad-tabla.component.html',
  styleUrl: './contabilidad-tabla.component.scss'
})
export class ContabilidadTablaComponent implements OnInit {
  @Input() registros: ContabilidadRegistro[] = [];
  @Output() editarRegistro = new EventEmitter<ContabilidadRegistro>();
  @Output() eliminarRegistro = new EventEmitter<string>();

  // Variables para el modal de edición
  mostrarModalEdicion = false;
  registroEditando: ContabilidadRegistro | null = null;

  // Datos del formulario de edición
  fechaEdit: string = '';
  ingresoEdit: number = 0;
  gastosEdit: number = 0;
  observacionesEdit: string = '';
  totalEdit: number = 0;

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    this.cargarRegistros();
  }

  async cargarRegistros() {
    try {
      const registrosRef = collection(this.firestore, 'contabilidad');
      const q = query(registrosRef, orderBy('fechaCreacion', 'desc'));
      const querySnapshot = await getDocs(q);

      this.registros = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          fechaCreacion: data['fechaCreacion']?.toDate() || new Date()
        } as ContabilidadRegistro;
      });
    } catch (error) {
      console.error('Error al cargar registros:', error);
      alert('Error al cargar los registros desde Firebase');
    }
  }

  async actualizarTabla() {
    await this.cargarRegistros();
  }

  onEditar(registro: ContabilidadRegistro) {
    this.registroEditando = registro;

    // Llenar el formulario con los datos actuales
    this.fechaEdit = registro.fecha;
    this.ingresoEdit = registro.ingreso;
    this.gastosEdit = registro.gastos;
    this.observacionesEdit = registro.observaciones;
    this.totalEdit = registro.total;

    this.mostrarModalEdicion = true;
  }

  calcularTotalEdit() {
    this.totalEdit = this.ingresoEdit - this.gastosEdit;
  }

  async guardarEdicion() {
    if (!this.fechaEdit || !this.observacionesEdit || !this.registroEditando) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (!this.registroEditando.id) {
      alert('ID no válido');
      return;
    }

    try {
      const datosActualizados = {
        fecha: this.fechaEdit,
        ingreso: this.ingresoEdit,
        gastos: this.gastosEdit,
        observaciones: this.observacionesEdit,
        total: this.totalEdit
      };

      const docRef = doc(this.firestore, 'contabilidad', this.registroEditando.id);
      await updateDoc(docRef, datosActualizados);

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
    this.limpiarFormularioEdicion();
  }

  limpiarFormularioEdicion() {
    this.fechaEdit = '';
    this.ingresoEdit = 0;
    this.gastosEdit = 0;
    this.observacionesEdit = '';
    this.totalEdit = 0;
  }

  async onEliminar(id: string | undefined) {
    if (!id) {
      alert('ID no válido');
      return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      try {
        const docRef = doc(this.firestore, 'contabilidad', id);
        await deleteDoc(docRef);
        await this.cargarRegistros();
        alert('Registro eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar registro:', error);
        alert('Error al eliminar el registro');
      }
    }
  }

  getTotalGeneral(): number {
    return this.registros.reduce((total, registro) => total + registro.total, 0);
  }

  getTotalIngresos(): number {
    return this.registros.reduce((total, registro) => total + registro.ingreso, 0);
  }

  getTotalGastos(): number {
    return this.registros.reduce((total, registro) => total + registro.gastos, 0);
  }
}
