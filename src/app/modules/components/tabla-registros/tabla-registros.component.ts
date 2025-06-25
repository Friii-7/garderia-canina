import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistroPerro } from '../registro-formulario/registro-formulario.component';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-tabla-registros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabla-registros.component.html',
  styleUrl: './tabla-registros.component.scss'
})
export class TablaRegistrosComponent {
  @Input() registros: RegistroPerro[] = [];
  @Output() verDetalle = new EventEmitter<RegistroPerro>();

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
