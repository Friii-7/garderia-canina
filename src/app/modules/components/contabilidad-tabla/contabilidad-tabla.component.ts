import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContabilidadRegistro } from '../contabilidad-formulario/contabilidad-formulario.component';
import { Firestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import * as XLSX from 'xlsx';
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-contabilidad-tabla',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionModalComponent],
  templateUrl: './contabilidad-tabla.component.html',
  styleUrl: './contabilidad-tabla.component.scss'
})
export class ContabilidadTablaComponent implements OnInit, AfterViewInit {
  @Input() registros: ContabilidadRegistro[] = [];
  @Output() editarRegistro = new EventEmitter<ContabilidadRegistro>();
  @Output() eliminarRegistro = new EventEmitter<string>();

  // Campo de búsqueda
  terminoBusqueda: string = '';

  // Variables para filtro por fechas
  mesInicio: string = '';
  mesFin: string = '';

  // Variables para el modal de edición
  mostrarModalEdicion = false;
  registroEditando: ContabilidadRegistro | null = null;

  // Variables para el modal de confirmación de Excel
  mostrarModalExcel = false;
  datosModalExcel: ConfirmacionModalData = {
    titulo: 'Generar Archivo Excel',
    mensaje: '¿Estás seguro de que quieres generar el archivo Excel con todos los registros de contabilidad?',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Generar Excel',
    textoBotonCancelar: 'Cancelar'
  };

  // Variables para el modal de confirmación de PDF
  mostrarModalPDF = false;
  datosModalPDF: ConfirmacionModalData = {
    titulo: 'Generar Reporte PDF',
    mensaje: '¿Estás seguro de que quieres generar el reporte PDF con todos los registros de contabilidad?',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Generar PDF',
    textoBotonCancelar: 'Cancelar'
  };

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

  // Modal de confirmación de eliminación
  mostrarModalEliminacion = false;
  registroAEliminar: string | undefined;

  // Modal de error sin registros Excel
  mostrarModalErrorSinRegistrosExcel = false;
  datosModalErrorSinRegistrosExcel: ConfirmacionModalData = {
    titulo: 'Sin Registros',
    mensaje: 'No hay registros para generar el archivo Excel',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de éxito Excel
  mostrarModalExitoExcel = false;
  datosModalExitoExcel: ConfirmacionModalData = {
    titulo: 'Éxito',
    mensaje: 'Archivo Excel generado exitosamente',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de error Excel
  mostrarModalErrorExcel = false;
  datosModalErrorExcel: ConfirmacionModalData = {
    titulo: 'Error',
    mensaje: 'Error al generar el archivo Excel',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de error sin registros PDF
  mostrarModalErrorSinRegistrosPDF = false;
  datosModalErrorSinRegistrosPDF: ConfirmacionModalData = {
    titulo: 'Sin Registros',
    mensaje: 'No hay registros para generar el reporte PDF',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de éxito PDF
  mostrarModalExitoPDF = false;
  datosModalExitoPDF: ConfirmacionModalData = {
    titulo: 'Éxito',
    mensaje: 'Reporte PDF de contabilidad generado exitosamente',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de error PDF
  mostrarModalErrorPDF = false;
  datosModalErrorPDF: ConfirmacionModalData = {
    titulo: 'Error',
    mensaje: 'Error al generar el reporte PDF',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de confirmación de reporte mensual
  mostrarModalReporteMensual = false;
  datosModalReporteMensual: ConfirmacionModalData = {
    titulo: 'Generar Reporte Mensual',
    mensaje: '¿Estás seguro de que quieres generar el reporte mensual con los registros filtrados?',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Generar Reporte',
    textoBotonCancelar: 'Cancelar'
  };

  // Modal de éxito reporte mensual
  mostrarModalExitoReporteMensual = false;
  datosModalExitoReporteMensual: ConfirmacionModalData = {
    titulo: 'Éxito',
    mensaje: 'Reporte mensual generado exitosamente',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de error reporte mensual
  mostrarModalErrorReporteMensual = false;
  datosModalErrorReporteMensual: ConfirmacionModalData = {
    titulo: 'Error',
    mensaje: 'Error al generar el reporte mensual',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Modal de error sin registros reporte mensual
  mostrarModalErrorSinRegistrosReporteMensual = false;
  datosModalErrorSinRegistrosReporteMensual: ConfirmacionModalData = {
    titulo: 'Sin Registros',
    mensaje: 'No hay registros en el período seleccionado para generar el reporte',
    tipo: 'confirmar',
    textoBotonConfirmar: 'Aceptar'
  };

  // Datos del formulario de edición
  fechaEdit: string = '';
  ingresoEdit: number = 0;
  gastosEdit: number = 0;
  observacionesEdit: string = '';
  totalEdit: number = 0;

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
        const registrosRef = collection(this.firestore, 'contabilidad');
        const q = query(registrosRef, orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);

        const registros = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            ingreso: data['ingreso'] || 0,
            gastos: data['gastos'] || 0,
            total: data['total'] || 0,
            fechaCreacion: data['fechaCreacion']?.toDate() || new Date()
          } as ContabilidadRegistro;
        });

        this.ngZone.run(() => {
          this.registros = registros;
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
      this.mostrarModalValidacion = true;
      return;
    }

    if (!this.registroEditando.id) {
      this.mostrarModalErrorId = true;
      return;
    }

    try {
      await this.ngZone.runOutsideAngular(async () => {
        if (this.registroEditando && this.registroEditando.id) {
          const datosActualizados = {
            fecha: this.fechaEdit,
            ingreso: this.ingresoEdit,
            gastos: this.gastosEdit,
            observaciones: this.observacionesEdit,
            total: this.totalEdit
          };

          const docRef = doc(this.firestore, 'contabilidad', this.registroEditando.id);
          await updateDoc(docRef, datosActualizados);
        }
      });

      await this.cargarRegistros();
      this.cerrarModalEdicion();
      this.datosModalExito.mensaje = 'Registro actualizado exitosamente';
      this.mostrarModalExito = true;
    } catch (error) {
      console.error('Error al actualizar registro:', error);
      this.datosModalError.mensaje = 'Error al actualizar el registro';
      this.mostrarModalError = true;
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
      this.mostrarModalErrorId = true;
      return;
    }
    this.registroAEliminar = id;
    this.mostrarModalEliminacion = true;
  }

  async confirmarEliminacion() {
    if (!this.registroAEliminar) {
      this.mostrarModalEliminacion = false;
      return;
    }
    try {
      await this.ngZone.runOutsideAngular(async () => {
        const docRef = doc(this.firestore, 'contabilidad', this.registroAEliminar!);
        await deleteDoc(docRef);
      });
      await this.cargarRegistros();
      this.mostrarModalEliminacion = false;
      this.registroAEliminar = undefined;
      this.datosModalExito.mensaje = 'Registro eliminado exitosamente';
      this.mostrarModalExito = true;
    } catch (error) {
      console.error('Error al eliminar registro:', error);
      this.mostrarModalEliminacion = false;
      this.datosModalError.mensaje = 'Error al eliminar el registro';
      this.mostrarModalError = true;
    }
  }

  cancelarEliminacion() {
    this.mostrarModalEliminacion = false;
    this.registroAEliminar = undefined;
  }

  getTotalGeneral(): number {
    return this.getTotalIngresos() - this.getTotalGastos();
  }

  getTotalIngresos(): number {
    return this.registros.reduce((total, registro) => total + registro.ingreso, 0);
  }

  getTotalGastos(): number {
    return this.registros.reduce((total, registro) => total + registro.gastos, 0);
  }

  // Getter para filtrar registros
  get registrosFiltrados(): ContabilidadRegistro[] {
    if (!this.terminoBusqueda.trim()) {
      return this.registros;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    return this.registros.filter(registro =>
      registro.fecha.toLowerCase().includes(termino) ||
      (registro.observaciones && registro.observaciones.toLowerCase().includes(termino)) ||
      (registro.ingreso && registro.ingreso.toString().includes(termino)) ||
      (registro.gastos && registro.gastos.toString().includes(termino)) ||
      (registro.total && registro.total.toString().includes(termino))
    );
  }

  // Getter para filtrar registros por fecha
  get registrosFiltradosPorFecha(): ContabilidadRegistro[] {
    let registros = this.registrosFiltrados;

    if (this.mesInicio || this.mesFin) {
      registros = registros.filter(registro => {
        const fechaRegistro = new Date(registro.fecha);
        const fechaRegistroStr = fechaRegistro.getFullYear() + '-' +
          String(fechaRegistro.getMonth() + 1).padStart(2, '0');

        if (this.mesInicio && this.mesFin) {
          return fechaRegistroStr >= this.mesInicio && fechaRegistroStr <= this.mesFin;
        } else if (this.mesInicio) {
          return fechaRegistroStr >= this.mesInicio;
        } else if (this.mesFin) {
          return fechaRegistroStr <= this.mesFin;
        }
        return true;
      });
    }

    return registros;
  }

  // Método para aplicar filtro de fechas
  aplicarFiltroFechas() {
    // El filtro se aplica automáticamente a través del getter
    console.log('Filtro de fechas aplicado:', { mesInicio: this.mesInicio, mesFin: this.mesFin });
  }

  // Método para limpiar filtro de fechas
  limpiarFiltroFechas() {
    this.mesInicio = '';
    this.mesFin = '';
  }

  // Función para mostrar el modal de confirmación de Excel
  mostrarConfirmacionExcel() {
    if (this.registros.length === 0) {
      this.mostrarModalErrorSinRegistrosExcel = true;
      return;
    }

    // Actualizar el mensaje del modal con información de los registros
    const totalRegistros = this.registros.length;
    const totalIngresos = this.getTotalIngresos();
    const totalGastos = this.getTotalGastos();
    const balanceGeneral = this.getTotalGeneral();

    this.datosModalExcel.mensaje = `¿Estás seguro de que quieres generar el archivo Excel?\n\n` +
      `• Total de registros: ${totalRegistros}\n` +
      `• Total de ingresos: $${totalIngresos.toFixed(2)}\n` +
      `• Total de gastos: $${totalGastos.toFixed(2)}\n` +
      `• Balance general: $${balanceGeneral.toFixed(2)}`;

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

  generarExcel() {
    try {
      // Preparar los datos para Excel
      const datosExcel = this.registros.map(registro => ({
        'Fecha': registro.fecha,
        'Ingresos ($)': registro.ingreso,
        'Gastos ($)': registro.gastos,
        'Total ($)': registro.total,
        'Observaciones': registro.observaciones,
        'Fecha de Creación': registro.fechaCreacion ? registro.fechaCreacion.toLocaleDateString() : ''
      }));

      // Agregar fila de totales
      const totales = {
        'Fecha': 'TOTALES',
        'Ingresos ($)': this.getTotalIngresos(),
        'Gastos ($)': this.getTotalGastos(),
        'Total ($)': this.getTotalGeneral(),
        'Observaciones': '',
        'Fecha de Creación': ''
      };
      datosExcel.push(totales);

      // Crear el workbook y worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(datosExcel);

      // Ajustar el ancho de las columnas
      const columnWidths = [
        { wch: 12 }, // Fecha
        { wch: 15 }, // Ingresos
        { wch: 15 }, // Gastos
        { wch: 15 }, // Total
        { wch: 40 }, // Observaciones
        { wch: 20 }  // Fecha de Creación
      ];
      worksheet['!cols'] = columnWidths;

      // Agregar el worksheet al workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contabilidad');

      // Generar el archivo y descargarlo
      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivo = `contabilidad_${fechaActual}.xlsx`;
      XLSX.writeFile(workbook, nombreArchivo);

      this.mostrarModalExitoExcel = true;
    } catch (error) {
      console.error('Error al generar Excel:', error);
      this.mostrarModalErrorExcel = true;
    }
  }

  // Función para mostrar el modal de confirmación de PDF
  mostrarConfirmacionPDF() {
    if (this.registros.length === 0) {
      this.mostrarModalErrorSinRegistrosPDF = true;
      return;
    }

    // Actualizar el mensaje del modal con información de los registros
    const totalRegistros = this.registros.length;
    const totalIngresos = this.getTotalIngresos();
    const totalGastos = this.getTotalGastos();
    const balanceGeneral = this.getTotalGeneral();

    this.datosModalPDF.mensaje = `¿Estás seguro de que quieres generar el reporte PDF?\n\n` +
      `• Total de registros: ${totalRegistros}\n` +
      `• Total de ingresos: $${totalIngresos.toFixed(2)}\n` +
      `• Total de gastos: $${totalGastos.toFixed(2)}\n` +
      `• Balance general: $${balanceGeneral.toFixed(2)}`;

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

  // Función para mostrar el modal de confirmación de reporte mensual
  mostrarConfirmacionReporteMensual() {
    if (this.registrosFiltradosPorFecha.length === 0) {
      this.mostrarModalErrorSinRegistrosReporteMensual = true;
      return;
    }

    // Actualizar el mensaje del modal con información del período
    const totalRegistros = this.registrosFiltradosPorFecha.length;
    const totalIngresos = this.getTotalIngresosFiltrados();
    const totalGastos = this.getTotalGastosFiltrados();
    const balanceGeneral = this.getTotalGeneralFiltrados();
    const periodo = this.obtenerPeriodoSeleccionado();

    this.datosModalReporteMensual.mensaje = `¿Estás seguro de que quieres generar el reporte mensual?\n\n` +
      `• Período: ${periodo}\n` +
      `• Total de registros: ${totalRegistros}\n` +
      `• Total de ingresos: $${totalIngresos.toFixed(2)}\n` +
      `• Total de gastos: $${totalGastos.toFixed(2)}\n` +
      `• Balance del período: $${balanceGeneral.toFixed(2)}`;

    this.mostrarModalReporteMensual = true;
  }

  // Función para confirmar la generación de reporte mensual
  confirmarGenerarReporteMensual() {
    this.mostrarModalReporteMensual = false;
    this.generarReporteMensual();
  }

  // Función para cancelar la generación de reporte mensual
  cancelarGenerarReporteMensual() {
    this.mostrarModalReporteMensual = false;
  }

  // Función para generar reporte mensual
  async generarReporteMensual() {
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
      doc.text('Reporte Mensual de Contabilidad', margin + 36, 32);

      // Fecha del reporte
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const reportDate = `Fecha del reporte: ${new Date().toLocaleDateString()}`;
      const dateWidth = doc.getTextWidth(reportDate);
      doc.text(reportDate, pageWidth - margin - dateWidth, 18);

      // Información del período
      let y = 48;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('PERÍODO DEL REPORTE:', margin, y);
      y += 8;

      const periodo = this.obtenerPeriodoSeleccionado();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(periodo, margin, y);
      y += 12;

      // Estadísticas del período
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('RESUMEN DEL PERÍODO:', margin, y);
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
      doc.text(`${this.registrosFiltradosPorFecha.length}`, statsLeftX + 50, statsY);

      doc.setFont('helvetica', 'normal');
      doc.text('Total ingresos:', statsLeftX + 80, statsY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 0);
      doc.text(`$${this.getTotalIngresosFiltrados().toFixed(2)}`, statsLeftX + 130, statsY);

      statsY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text('Total gastos:', statsLeftX, statsY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text(`$${this.getTotalGastosFiltrados().toFixed(2)}`, statsLeftX + 50, statsY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text('Balance del período:', statsLeftX + 80, statsY);
      doc.setFont('helvetica', 'bold');
      const balancePeriodo = this.getTotalGeneralFiltrados();
      doc.setTextColor(balancePeriodo >= 0 ? 0 : 200, 0, 0);
      doc.text(`$${balancePeriodo.toFixed(2)}`, statsLeftX + 130, statsY);

      // Tabla de registros del período
      y += 50;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('REGISTROS DEL PERÍODO:', margin, y);
      y += 8;

      // Encabezados de la tabla
      const tableHeaders = ['Fecha', 'Ingresos', 'Gastos', 'Total', 'Observaciones'];
      const colWidths = [25, 25, 25, 25, 60];
      const rowHeight = 10;
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
        doc.text(header, currentX + 2, tableY + 6);
        currentX += colWidths[index];
      });

      // Filas de datos
      tableY += rowHeight;
      let pageNumber = 1;
      let registrosPorPagina = 0;
      const maxRegistrosPorPagina = 15;

      for (let i = 0; i < this.registrosFiltradosPorFecha.length; i++) {
        const registro = this.registrosFiltradosPorFecha[i];

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
            doc.text(header, currentX + 2, tableY + 6);
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

        currentX = tableX;
        doc.setTextColor(60, 60, 60);
        doc.text(registro.fecha, currentX + 2, tableY + 6);
        currentX += colWidths[0];

        doc.setTextColor(0, 128, 0);
        doc.text(`$${(registro.ingreso || 0).toFixed(2)}`, currentX + 2, tableY + 6);
        currentX += colWidths[1];

        doc.setTextColor(200, 0, 0);
        doc.text(`$${(registro.gastos || 0).toFixed(2)}`, currentX + 2, tableY + 6);
        currentX += colWidths[2];

        const total = (registro.total || 0);
        doc.setTextColor(total >= 0 ? 0 : 200, 0, 0);
        doc.text(`$${total.toFixed(2)}`, currentX + 2, tableY + 6);
        currentX += colWidths[3];

        doc.setTextColor(60, 60, 60);
        const observaciones = registro.observaciones || '';
        doc.text(observaciones.substring(0, 35), currentX + 2, tableY + 6);

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
      doc.text(`Reporte mensual generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, margin, footerY);

      // Guardar el archivo
      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivo = `reporte_mensual_contabilidad_${fechaActual}.pdf`;
      doc.save(nombreArchivo);

      this.mostrarModalExitoReporteMensual = true;
    } catch (error) {
      console.error('Error al generar reporte mensual:', error);
      this.mostrarModalErrorReporteMensual = true;
    }
  }

  // Métodos auxiliares para cálculos filtrados
  getTotalIngresosFiltrados(): number {
    return this.registrosFiltradosPorFecha.reduce((total, registro) => total + registro.ingreso, 0);
  }

  getTotalGastosFiltrados(): number {
    return this.registrosFiltradosPorFecha.reduce((total, registro) => total + registro.gastos, 0);
  }

  getTotalGeneralFiltrados(): number {
    return this.getTotalIngresosFiltrados() - this.getTotalGastosFiltrados();
  }

  obtenerPeriodoSeleccionado(): string {
    if (this.mesInicio && this.mesFin) {
      const inicio = new Date(this.mesInicio + '-01');
      const fin = new Date(this.mesFin + '-01');
      return `${inicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} - ${fin.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    } else if (this.mesInicio) {
      const inicio = new Date(this.mesInicio + '-01');
      return `Desde ${inicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    } else if (this.mesFin) {
      const fin = new Date(this.mesFin + '-01');
      return `Hasta ${fin.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    }
    return 'Todos los registros';
  }

  // Función para generar PDF general con todos los registros de contabilidad
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
      doc.text('Reporte de Contabilidad', margin + 36, 32);

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
      doc.text('RESUMEN FINANCIERO:', margin, y);
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
      doc.setTextColor(0, 128, 0);
      doc.text(`$${this.getTotalIngresos().toFixed(2)}`, statsLeftX + 130, statsY);

      statsY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text('Total gastos:', statsLeftX, statsY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text(`$${this.getTotalGastos().toFixed(2)}`, statsLeftX + 50, statsY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text('Balance general:', statsLeftX + 80, statsY);
      doc.setFont('helvetica', 'bold');
      const balanceGeneral = this.getTotalGeneral();
      doc.setTextColor(balanceGeneral >= 0 ? 0 : 200, 0, 0);
      doc.text(`$${balanceGeneral.toFixed(2)}`, statsLeftX + 130, statsY);

      // Tabla de registros
      y += 50;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('REGISTROS CONTABLES:', margin, y);
      y += 8;

      // Encabezados de la tabla
      const tableHeaders = ['Fecha', 'Ingresos', 'Gastos', 'Total', 'Observaciones'];
      const colWidths = [25, 25, 25, 25, 60];
      const rowHeight = 10;
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
        doc.text(header, currentX + 2, tableY + 6);
        currentX += colWidths[index];
      });

      // Filas de datos
      tableY += rowHeight;
      let pageNumber = 1;
      let registrosPorPagina = 0;
      const maxRegistrosPorPagina = 15;

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
            doc.text(header, currentX + 2, tableY + 6);
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

        currentX = tableX;
        doc.setTextColor(60, 60, 60);
        doc.text(registro.fecha, currentX + 2, tableY + 6);
        currentX += colWidths[0];

        doc.setTextColor(0, 128, 0);
        doc.text(`$${(registro.ingreso || 0).toFixed(2)}`, currentX + 2, tableY + 6);
        currentX += colWidths[1];

        doc.setTextColor(200, 0, 0);
        doc.text(`$${(registro.gastos || 0).toFixed(2)}`, currentX + 2, tableY + 6);
        currentX += colWidths[2];

        const total = (registro.total || 0);
        doc.setTextColor(total >= 0 ? 0 : 200, 0, 0);
        doc.text(`$${total.toFixed(2)}`, currentX + 2, tableY + 6);
        currentX += colWidths[3];

        doc.setTextColor(60, 60, 60);
        const observaciones = registro.observaciones || '';
        doc.text(observaciones.substring(0, 35), currentX + 2, tableY + 6);

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
      const nombreArchivo = `reporte_contabilidad_${fechaActual}.pdf`;
      doc.save(nombreArchivo);

      this.mostrarModalExitoPDF = true;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.mostrarModalErrorPDF = true;
    }
  }

  // Métodos para cerrar modales
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

  cerrarModalErrorSinRegistrosExcel() {
    this.mostrarModalErrorSinRegistrosExcel = false;
  }

  cerrarModalExitoExcel() {
    this.mostrarModalExitoExcel = false;
  }

  cerrarModalErrorExcel() {
    this.mostrarModalErrorExcel = false;
  }

  cerrarModalErrorSinRegistrosPDF() {
    this.mostrarModalErrorSinRegistrosPDF = false;
  }

  cerrarModalExitoPDF() {
    this.mostrarModalExitoPDF = false;
  }

  cerrarModalErrorPDF() {
    this.mostrarModalErrorPDF = false;
  }

  cerrarModalReporteMensual() {
    this.mostrarModalReporteMensual = false;
  }

  cerrarModalExitoReporteMensual() {
    this.mostrarModalExitoReporteMensual = false;
  }

  cerrarModalErrorReporteMensual() {
    this.mostrarModalErrorReporteMensual = false;
  }

  cerrarModalErrorSinRegistrosReporteMensual() {
    this.mostrarModalErrorSinRegistrosReporteMensual = false;
  }
}
