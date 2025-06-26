import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroPerro } from '../registro-formulario/registro-formulario.component';
import { jsPDF } from 'jspdf';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-tabla-registros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tabla-registros.component.html',
  styleUrl: './tabla-registros.component.scss'
})
export class TablaRegistrosComponent implements OnInit {
  registros: RegistroPerro[] = [];
  @Output() verDetalle = new EventEmitter<RegistroPerro>();
  @Output() editarRegistroEvent = new EventEmitter<RegistroPerro>();

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    this.cargarRegistros();
  }

  async cargarRegistros() {
    try {
      const registrosRef = collection(this.firestore, 'registros');
      const q = query(registrosRef, orderBy('fechaCreacion', 'desc'));
      const querySnapshot = await getDocs(q);

      this.registros = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          fechaCreacion: data['fechaCreacion']?.toDate() || new Date()
        } as RegistroPerro & { id: string };
      });
    } catch (error) {
      console.error('Error al cargar registros:', error);
      alert('Error al cargar los registros desde Firebase');
    }
  }

  async actualizarTabla() {
    await this.cargarRegistros();
  }

  // Variables para el modal de edición
  mostrarModalEdicion = false;
  registroEditando: any = null;

  // Datos del formulario de edición
  nombreMascotaEdit: string = '';
  fechaIngresoEdit: string = '';
  tamanoPerroEdit: string = '';
  diasAlojamientoEdit: number = 0;
  servicioDiSolEdit: boolean = false;
  servicioBanoEdit: boolean = false;
  gastosEdit: number = 0;

  // Valores calculados para edición
  ingresosEdit: number = 0;
  totalEdit: number = 0;

  // Tarifas
  readonly tarifaDiSol = 25000;
  readonly tarifaBano = 50000;

  // Opciones de tamaño
  opcionesTamano = [
    { valor: '35000', texto: 'Pequeño (35 000 COP/día)' },
    { valor: '40000', texto: 'Mediano (40 000 COP/día)' },
    { valor: '45000', texto: 'Grande (45 000 COP/día)' }
  ];

  editarRegistro(registro: any) {
    this.registroEditando = registro;

    // Llenar el formulario con los datos actuales
    this.nombreMascotaEdit = registro.nombre;
    this.fechaIngresoEdit = registro.fecha;

    // Encontrar el valor del tamaño basado en el texto
    const tamanoEncontrado = this.opcionesTamano.find(op => op.texto === registro.tamano);
    this.tamanoPerroEdit = tamanoEncontrado ? tamanoEncontrado.valor : '';

    this.diasAlojamientoEdit = registro.dias;
    this.servicioDiSolEdit = registro.diSol;
    this.servicioBanoEdit = registro.bano;
    this.gastosEdit = registro.gastos;

    this.actualizarIngresosEdit();
    this.mostrarModalEdicion = true;
  }

  actualizarIngresosEdit() {
    const rateDia = parseFloat(this.tamanoPerroEdit) || 0;
    const dias = this.diasAlojamientoEdit || 0;
    const costoAloja = rateDia * dias;
    const costoDiSol = this.servicioDiSolEdit ? this.tarifaDiSol : 0;
    const costoBano = this.servicioBanoEdit ? this.tarifaBano : 0;
    this.ingresosEdit = costoAloja + costoDiSol + costoBano;
    this.calcularTotalEdit();
  }

  calcularTotalEdit() {
    this.totalEdit = this.ingresosEdit + (this.gastosEdit || 0);
  }

  async guardarEdicion() {
    if (!this.nombreMascotaEdit || !this.fechaIngresoEdit || !this.tamanoPerroEdit) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const tamanoTexto = this.opcionesTamano.find(op => op.valor === this.tamanoPerroEdit)?.texto || '';

      const datosActualizados = {
        nombre: this.nombreMascotaEdit,
        fecha: this.fechaIngresoEdit,
        tamano: tamanoTexto,
        dias: this.diasAlojamientoEdit,
        diSol: this.servicioDiSolEdit,
        bano: this.servicioBanoEdit,
        ingresos: this.ingresosEdit,
        gastos: this.gastosEdit,
        total: this.totalEdit
      };

      const docRef = doc(this.firestore, 'registros', this.registroEditando.id);
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
    this.nombreMascotaEdit = '';
    this.fechaIngresoEdit = '';
    this.tamanoPerroEdit = '';
    this.diasAlojamientoEdit = 0;
    this.servicioDiSolEdit = false;
    this.servicioBanoEdit = false;
    this.gastosEdit = 0;
    this.ingresosEdit = 0;
    this.totalEdit = 0;
  }

  async eliminarRegistro(registro: any) {
    if (confirm(`¿Está seguro que desea eliminar el registro de ${registro.nombre}?`)) {
      try {
        const docRef = doc(this.firestore, 'registros', registro.id);
        await deleteDoc(docRef);
        await this.cargarRegistros();
        alert('Registro eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar registro:', error);
        alert('Error al eliminar el registro');
      }
    }
  }

  registroSeleccionado: RegistroPerro | null = null;
  mostrarModal = false;

  abrirModal(registro: RegistroPerro) {
    this.registroSeleccionado = registro;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.registroSeleccionado = null;
  }

  generarPDF() {
    if (!this.registroSeleccionado) return;

    const doc = new jsPDF();
    const reg = this.registroSeleccionado;
    let y = 20;

    doc.setFontSize(16);
    doc.text('Detalle de registro - Guardería Canina', 20, 15);

    doc.setFontSize(12);
    const detalles = [
      `Nombre: ${reg.nombre}`,
      `Fecha ingreso: ${reg.fecha}`,
      `Tamaño: ${reg.tamano}`,
      `Días alojamiento: ${reg.dias}`,
      `Di sol: ${reg.diSol ? 'Sí' : 'No'}`,
      `Baño: ${reg.bano ? 'Sí' : 'No'}`,
      `Ingresos: $${reg.ingresos.toLocaleString()} COP`,
      `Gastos: $${reg.gastos.toLocaleString()} COP`,
      `Total: $${reg.total.toLocaleString()} COP`
    ];

    detalles.forEach(detalle => {
      doc.text(detalle, 20, y);
      y += 8;
    });

    doc.save(`registro-${reg.nombre}-${reg.fecha}.pdf`);
  }

  obtenerUltimoRegistro(): RegistroPerro | null {
    return this.registros.length > 0 ? this.registros[this.registros.length - 1] : null;
  }
}
