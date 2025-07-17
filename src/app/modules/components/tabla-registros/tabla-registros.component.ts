import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroPerro } from '../registro-formulario/registro-formulario.component';
import { jsPDF } from 'jspdf';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import * as XLSX from 'xlsx';
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';

@Component({
  selector: 'app-tabla-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionModalComponent],
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

  // Variables para el modal de confirmación de Excel
  mostrarModalExcel = false;
  datosModalExcel: ConfirmacionModalData = {
    titulo: 'Generar Archivo Excel',
    mensaje: '¿Estás seguro de que quieres generar el archivo Excel con todos los registros de perros?',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Generar Excel',
    textoBotonCancelar: 'Cancelar'
  };

  // Variables para el modal de confirmación de PDF
  mostrarModalPDF = false;
  datosModalPDF: ConfirmacionModalData = {
    titulo: 'Generar Reporte PDF',
    mensaje: '¿Estás seguro de que quieres generar el reporte PDF con todos los registros de perros?',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Generar PDF',
    textoBotonCancelar: 'Cancelar'
  };

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

  // Función para mostrar el modal de confirmación de Excel
  mostrarConfirmacionExcel() {
    if (this.registros.length === 0) {
      alert('No hay registros para generar el archivo Excel');
      return;
    }

    // Actualizar el mensaje del modal con información de los registros
    const totalRegistros = this.registros.length;
    const totalIngresos = this.getTotalIngresos();
    const totalGastos = this.getTotalGastos();
    const balanceGeneral = this.getTotalGeneral();

    this.datosModalExcel.mensaje = `¿Estás seguro de que quieres generar el archivo Excel?\n\n` +
      `• Total de registros: ${totalRegistros}\n` +
      `• Total de ingresos: $${totalIngresos.toLocaleString('es-CO')}\n` +
      `• Total de gastos: $${totalGastos.toLocaleString('es-CO')}\n` +
      `• Balance general: $${balanceGeneral.toLocaleString('es-CO')}`;

    this.mostrarModalExcel = true;
  }

  // Función para confirmar la generación de Excel
  confirmarGenerarExcel() {
    this.mostrarModalExcel = false;
    this.generarExcel();
  }

  // Función para cancelar la generación de Excel
  cancelarGenerarExcel() {
    this.mostrarModalExcel = false;
  }

  // Función para generar archivo Excel
  generarExcel() {
    try {
      // Preparar los datos para Excel
      const datosExcel = this.registros.map(registro => ({
        'Nombre de la Mascota': registro.nombre,
        'Fecha de Ingreso': registro.fecha,
        'Tamaño del Perro': registro.tamano,
        'Días de Alojamiento': registro.dias,
        'Servicio Di Sol': registro.diSol ? 'Sí' : 'No',
        'Servicio de Baño': registro.bano ? 'Sí' : 'No',
        'Ingresos (COP)': registro.ingresos,
        'Gastos (COP)': registro.gastos,
        'Total (COP)': registro.total,
        'Método de Pago': registro.metodoPago,
        'Fecha de Creación': registro.fechaCreacion ? registro.fechaCreacion.toLocaleDateString() : ''
      }));

      // Agregar fila de totales
      const totales = {
        'Nombre de la Mascota': 'TOTALES',
        'Fecha de Ingreso': '',
        'Tamaño del Perro': '',
        'Días de Alojamiento': 0,
        'Servicio Di Sol': '',
        'Servicio de Baño': '',
        'Ingresos (COP)': this.getTotalIngresos(),
        'Gastos (COP)': this.getTotalGastos(),
        'Total (COP)': this.getTotalGeneral(),
        'Método de Pago': '',
        'Fecha de Creación': ''
      };
      datosExcel.push(totales);

      // Crear el workbook y worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(datosExcel);

      // Ajustar el ancho de las columnas
      const columnWidths = [
        { wch: 20 }, // Nombre de la Mascota
        { wch: 15 }, // Fecha de Ingreso
        { wch: 25 }, // Tamaño del Perro
        { wch: 18 }, // Días de Alojamiento
        { wch: 15 }, // Servicio Di Sol
        { wch: 18 }, // Servicio de Baño
        { wch: 15 }, // Ingresos
        { wch: 15 }, // Gastos
        { wch: 15 }, // Total
        { wch: 20 }, // Método de Pago
        { wch: 20 }  // Fecha de Creación
      ];
      worksheet['!cols'] = columnWidths;

      // Agregar el worksheet al workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros Perros');

      // Generar el archivo y descargarlo
      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivo = `registros_perros_${fechaActual}.xlsx`;
      XLSX.writeFile(workbook, nombreArchivo);

      alert('Archivo Excel generado exitosamente');
    } catch (error) {
      console.error('Error al generar Excel:', error);
      alert('Error al generar el archivo Excel');
    }
  }

  // Funciones auxiliares para obtener totales
  getTotalIngresos(): number {
    return this.registros.reduce((total, registro) => total + (registro.ingresos || 0), 0);
  }

  getTotalGastos(): number {
    return this.registros.reduce((total, registro) => total + (registro.gastos || 0), 0);
  }

  getTotalGeneral(): number {
    return this.getTotalIngresos() - this.getTotalGastos();
  }

  // Función para mostrar el modal de confirmación de PDF
  mostrarConfirmacionPDF() {
    if (this.registros.length === 0) {
      alert('No hay registros para generar el reporte PDF');
      return;
    }

    // Actualizar el mensaje del modal con información de los registros
    const totalRegistros = this.registros.length;
    const totalIngresos = this.getTotalIngresos();
    const totalGastos = this.getTotalGastos();
    const balanceGeneral = this.getTotalGeneral();

    this.datosModalPDF.mensaje = `¿Estás seguro de que quieres generar el reporte PDF?\n\n` +
      `• Total de registros: ${totalRegistros}\n` +
      `• Total de ingresos: $${totalIngresos.toLocaleString('es-CO')}\n` +
      `• Total de gastos: $${totalGastos.toLocaleString('es-CO')}\n` +
      `• Balance general: $${balanceGeneral.toLocaleString('es-CO')}`;

    this.mostrarModalPDF = true;
  }

  // Función para confirmar la generación de PDF
  confirmarGenerarPDF() {
    this.mostrarModalPDF = false;
    this.generarPDFGeneral();
  }

  // Función para cancelar la generación de PDF
  cancelarGenerarPDF() {
    this.mostrarModalPDF = false;
  }

  // Función para generar PDF general con todos los registros
  async generarPDFGeneral() {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 16;

      // Cargar logo como base64
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

      // Encabezado con logo
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
      doc.text('Reporte General de Registros', margin + 36, 32);

      // Fecha del reporte
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const reportDate = `Fecha del reporte: ${new Date().toLocaleDateString()}`;
      const dateWidth = doc.getTextWidth(reportDate);
      doc.text(reportDate, pageWidth - margin - dateWidth, 18);

      // Estadísticas generales
      let y = 48;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('ESTADÍSTICAS GENERALES:', margin, y);
      y += 8;

      // Tarjeta de estadísticas
      const statsWidth = 160;
      const statsX = (pageWidth - statsWidth) / 2;
      doc.setFillColor(242, 245, 247);
      doc.roundedRect(statsX, y, statsWidth, 30, 8, 8, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(statsX + 1, y + 1, statsWidth, 30, 8, 8);

      const statsLeftX = statsX + 8;
      let statsY = y + 12;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      doc.text('Total de registros:', statsLeftX, statsY);
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.registros.length}`, statsLeftX + 50, statsY);

      doc.setFont('helvetica', 'normal');
      doc.text('Total ingresos:', statsLeftX + 80, statsY);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${this.getTotalIngresos().toLocaleString('es-CO')}`, statsLeftX + 130, statsY);

      statsY += 8;
      doc.setFont('helvetica', 'normal');
      doc.text('Total gastos:', statsLeftX, statsY);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${this.getTotalGastos().toLocaleString('es-CO')}`, statsLeftX + 50, statsY);

      doc.setFont('helvetica', 'normal');
      doc.text('Balance general:', statsLeftX + 80, statsY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.getTotalGeneral() >= 0 ? 0 : 200, 0, 0);
      doc.text(`$${this.getTotalGeneral().toLocaleString('es-CO')}`, statsLeftX + 130, statsY);

      // Tabla de registros
      y += 50;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('REGISTROS DETALLADOS:', margin, y);
      y += 8;

      // Encabezados de la tabla
      const tableHeaders = ['Nombre', 'Fecha', 'Días', 'Ingresos', 'Gastos', 'Total'];
      const colWidths = [35, 25, 15, 25, 25, 25];
      const rowHeight = 8;
      let tableX = margin;
      let tableY = y;

      // Fondo del encabezado
      doc.setFillColor(200, 202, 205);
      doc.rect(tableX, tableY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');

      // Texto del encabezado
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      let currentX = tableX;
      tableHeaders.forEach((header, index) => {
        doc.text(header, currentX + 2, tableY + 5);
        currentX += colWidths[index];
      });

      // Filas de datos
      tableY += rowHeight;
      let pageNumber = 1;
      let registrosPorPagina = 0;
      const maxRegistrosPorPagina = 20;

      for (let i = 0; i < this.registros.length; i++) {
        const registro = this.registros[i];

        // Verificar si necesitamos nueva página
        if (registrosPorPagina >= maxRegistrosPorPagina) {
          doc.addPage();
          pageNumber++;
          tableY = 20;
          registrosPorPagina = 0;

          // Repetir encabezado en nueva página
          doc.setFillColor(200, 202, 205);
          doc.rect(tableX, tableY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          currentX = tableX;
          tableHeaders.forEach((header, index) => {
            doc.text(header, currentX + 2, tableY + 5);
            currentX += colWidths[index];
          });
          tableY += rowHeight;
        }

        // Fondo alterno para las filas
        if (registrosPorPagina % 2 === 0) {
          doc.setFillColor(245, 250, 252);
          doc.rect(tableX, tableY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        }

        // Datos de la fila
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        currentX = tableX;
        doc.text(registro.nombre.substring(0, 15), currentX + 2, tableY + 5);
        currentX += colWidths[0];

        doc.text(registro.fecha, currentX + 2, tableY + 5);
        currentX += colWidths[1];

        doc.text(registro.dias.toString(), currentX + 2, tableY + 5);
        currentX += colWidths[2];

        doc.text(`$${(registro.ingresos || 0).toLocaleString('es-CO')}`, currentX + 2, tableY + 5);
        currentX += colWidths[3];

        doc.text(`$${(registro.gastos || 0).toLocaleString('es-CO')}`, currentX + 2, tableY + 5);
        currentX += colWidths[4];

        doc.setTextColor((registro.total || 0) >= 0 ? 0 : 200, 0, 0);
        doc.text(`$${(registro.total || 0).toLocaleString('es-CO')}`, currentX + 2, tableY + 5);

        tableY += rowHeight;
        registrosPorPagina++;
      }

      // Bordes de la tabla
      doc.setDrawColor(200, 200, 200);
      doc.rect(tableX, y, colWidths.reduce((a, b) => a + b, 0), tableY - y);

      // Pie de página
      let footerY = pageHeight - 20;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text(`Página ${pageNumber}`, pageWidth - margin - 30, footerY);
      doc.text(`Reporte generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, margin, footerY);

      // Guardar el archivo
      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivo = `reporte_registros_${fechaActual}.pdf`;
      doc.save(nombreArchivo);

      alert('Reporte PDF generado exitosamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el reporte PDF');
    }
  }
}
