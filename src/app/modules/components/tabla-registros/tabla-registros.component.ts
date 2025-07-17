import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, NgZone, inject } from '@angular/core';
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
export class TablaRegistrosComponent implements OnInit, AfterViewInit {
  registros: RegistroPerro[] = [];
  @Output() verDetalle = new EventEmitter<RegistroPerro>();
  @Output() editarRegistroEvent = new EventEmitter<RegistroPerro>();

  // Propiedades para los totales
  totalIngresos: number = 0;
  totalGastos: number = 0;
  totalGeneral: number = 0;

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
        const registrosRef = collection(this.firestore, 'registros');
        const q = query(registrosRef, orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);

        const registros = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            ingresos: data['ingresos'] || 0,
            gastos: data['gastos'] || 0,
            total: data['total'] || 0,
            dias: data['dias'] || 0,
            fechaCreacion: data['fechaCreacion']?.toDate() || new Date()
          } as RegistroPerro & { id: string };
        });

        this.ngZone.run(() => {
          this.registros = registros;
          this.calcularTotales();
        });
      });
    } catch (error) {
      console.error('Error al cargar registros:', error);
      alert('Error al cargar los registros desde Firebase');
    }
  }

  // Método para calcular los totales
  calcularTotales() {
    this.totalIngresos = this.registros.reduce((sum, registro) => sum + (registro.ingresos || 0), 0);
    this.totalGastos = this.registros.reduce((sum, registro) => sum + (registro.gastos || 0), 0);
    this.totalGeneral = this.totalIngresos - this.totalGastos;
  }

  async actualizarTabla() {
    await this.cargarRegistros();
    this.calcularTotales();
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
  metodoPagoEdit: string = '';

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

  // Opciones de método de pago
  opcionesMetodoPago = [
    { valor: 'efectivo', texto: 'Efectivo' },
    { valor: 'transferencia', texto: 'Transferencia' },
    { valor: 'tarjeta', texto: 'Tarjeta de Crédito/Débito' }
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
    this.metodoPagoEdit = registro.metodoPago;

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
    if (!this.nombreMascotaEdit || !this.fechaIngresoEdit || !this.tamanoPerroEdit || !this.metodoPagoEdit) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      await this.ngZone.runOutsideAngular(async () => {
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
          total: this.totalEdit,
          metodoPago: this.metodoPagoEdit
        };

        const docRef = doc(this.firestore, 'registros', this.registroEditando.id);
        await updateDoc(docRef, datosActualizados);
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
    this.metodoPagoEdit = '';
  }

  async eliminarRegistro(registro: any) {
    if (confirm(`¿Está seguro que desea eliminar el registro de ${registro.nombre}?`)) {
      try {
        await this.ngZone.runOutsideAngular(async () => {
          const docRef = doc(this.firestore, 'registros', registro.id);
          await deleteDoc(docRef);
        });
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

  async generarPDF() {
    if (!this.registroSeleccionado) return;

    const doc = new jsPDF();
    const reg = this.registroSeleccionado;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 16;

    // Cargar logo como base64 (usando fetch y FileReader)
    const logoUrl = 'public/assets/ui/logo.jpg';
    let logoBase64 = '';
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(blob);
      logoBase64 = await base64Promise;
    } catch (e) {
      logoBase64 = '';
    }

    // Encabezado con logo a la izquierda
    doc.setFillColor(235, 235, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');
    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', margin, 8, 24, 24);
    } else {
      doc.setFontSize(10);
      doc.setTextColor(180, 0, 0);
      doc.text('logo', margin + 8, 22, {align: 'center'});
    }
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('GUARDERÍA CANINA', margin + 36, 22);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Servicios profesionales para mascotas', margin + 36, 32);
    // Factura y fecha
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const invoiceNumber = `FACTURA #${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const invoiceWidth = doc.getTextWidth(invoiceNumber);
    doc.text(invoiceNumber, pageWidth - margin - invoiceWidth, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const invoiceDate = `Fecha: ${new Date().toLocaleDateString()}`;
    const dateWidth = doc.getTextWidth(invoiceDate);
    doc.text(invoiceDate, pageWidth - margin - dateWidth, 32);

    // Bloque de datos (solo cliente, centrado)
    let y = 48;
    const blockHeight = 44;
    const blockWidth = 110;
    const blockX = (pageWidth - blockWidth) / 2;
    doc.setFillColor(242, 245, 247); // gris muy claro
    doc.roundedRect(blockX, y, blockWidth, blockHeight, 8, 8, 'F');
    // Sombra simulada
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(blockX + 1, y + 1, blockWidth, blockHeight, 8, 8);

    // Datos del cliente (centrado)
    let leftX = blockX + 8;
    let leftY = y + 14;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('DATOS DEL CLIENTE:', leftX, leftY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    leftY += 7;
    doc.text('Cliente:', leftX, leftY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${reg.nombre}`, leftX + 28, leftY);
    doc.setFont('helvetica', 'normal');
    leftY += 6;
    doc.text('Fecha de Ingreso:', leftX, leftY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${reg.fecha}`, leftX + 40, leftY);
    doc.setFont('helvetica', 'normal');
    leftY += 6;
    doc.text('Duración:', leftX, leftY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${reg.dias} días`, leftX + 24, leftY);
    doc.setFont('helvetica', 'normal');
    leftY += 6;
    doc.text('Tamaño:', leftX, leftY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${reg.tamano}`, leftX + 20, leftY);

    // Detalle de servicios
    y += blockHeight + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('DETALLE DE SERVICIOS:', margin, y);
    y += 8;

    // Tabla de servicios moderna
    const services = [
      { description: 'Alojamiento', quantity: reg.dias, unitPrice: this.getUnitPrice(reg.tamano), total: this.getUnitPrice(reg.tamano) * reg.dias }
    ];
    if (reg.diSol) {
      services.push({ description: 'Servicio Di Sol', quantity: 1, unitPrice: this.tarifaDiSol, total: this.tarifaDiSol });
    }
    if (reg.bano) {
      services.push({ description: 'Servicio de Baño', quantity: 1, unitPrice: this.tarifaBano, total: this.tarifaBano });
    }
    const tableX = margin;
    const colWidths = [70, 20, 35, 35];
    const rowHeight = 9;
    // Encabezado tabla
    doc.setFillColor(200, 202, 205);
    doc.roundedRect(tableX, y, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, 4, 4, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Descripción', tableX + 2, y + 6);
    doc.text('Cant.', tableX + colWidths[0] + 2, y + 6);
    doc.text('Precio Unit.', tableX + colWidths[0] + colWidths[1] + 2, y + 6);
    doc.text('Total', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 6);
    // Filas de servicios
    let tableY = y + rowHeight;
    services.forEach((service, idx) => {
      // Fondo alterno
      if (idx % 2 === 0) {
        doc.setFillColor(245, 250, 252);
        doc.rect(tableX, tableY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(service.description, tableX + 2, tableY + 6);
      doc.text(service.quantity.toString(), tableX + colWidths[0] + 2, tableY + 6);
      doc.text(`$${(service.unitPrice || 0).toLocaleString('es-CO')}`, tableX + colWidths[0] + colWidths[1] + 2, tableY + 6);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(service.total || 0).toLocaleString('es-CO')}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableY + 6);
      tableY += rowHeight;
    });
    // Bordes tabla
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(tableX, y, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight * (services.length + 1), 4, 4);

    // Totales y método de pago alineados horizontalmente
    let totalsY = tableY + 14;
    // Método de pago a la izquierda
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Método de Pago:', margin, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(reg.metodoPago, margin + 45, totalsY);
    // Totales a la derecha
    let totX = pageWidth - margin - 60;
    let totY = totalsY;
    // Eliminado Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Gastos adicionales:', totX, totY);
    doc.text(`$${(reg.gastos || 0).toLocaleString('es-CO')}`, totX + 35, totY);
    totY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);
    doc.text('TOTAL:', totX, totY);
    doc.text(`$${(reg.total || 0).toLocaleString('es-CO')}`, totX + 35, totY);

    // Pie de página moderno
    let footerY = pageHeight - 30;
    doc.setFillColor(235, 235, 235);
    doc.rect(0, footerY, pageWidth, 30, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Gracias por confiar en nuestros servicios. Para consultas: contacto@guarderiacaninaestadio.com | +57 301 8517690', margin, footerY + 10);
    const footer = `Factura generada el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
    const footerWidth = doc.getTextWidth(footer);
    doc.text(footer, (pageWidth - footerWidth) / 2, footerY + 22);
    doc.save(`factura-${reg.nombre}-${reg.fecha}.pdf`);
  }

  private getUnitPrice(tamano: string): number {
    switch (tamano) {
      case 'Pequeño (35 000 COP/día)': return 35000;
      case 'Mediano (40 000 COP/día)': return 40000;
      case 'Grande (45 000 COP/día)': return 45000;
      default: return 40000;
    }
  }


}
