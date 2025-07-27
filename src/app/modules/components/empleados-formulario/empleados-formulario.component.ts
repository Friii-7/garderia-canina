import { Component, EventEmitter, Output, NgZone, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from '@angular/fire/firestore';
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';
import { Subject, takeUntil } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';

// Interfaces mejoradas con tipado más específico
export interface EmpleadoRegistro {
  id?: string;
  fecha: string;
  empleado: string;
  turno: 'Día' | 'Noche';
  pago: boolean;
}

export interface DiaTrabajo {
  fecha: string;
  turno: 'Día' | 'Noche';
  pago: boolean;
}

export interface RegistroNomina {
  id?: string;
  fecha: string;
  empleado: string;
  monto: number;
  observaciones: string;
  pagoRealizado: boolean;
}

export interface EmpleadoInfo {
  nombre: string;
  diasLaborales: number[]; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  fechasNomina: number[]; // Días del mes para pago de nómina
  colorEspecial?: string;
  turnoPredeterminado?: 'Día' | 'Noche';
  diasFestivos?: boolean;
  soloNomina?: boolean;
}

// Enum para tipos de modales
enum ModalType {
  CONFIRMATION = 'confirmation',
  SUCCESS = 'success',
  ERROR = 'error',
  VALIDATION = 'validation'
}

// Interface para gestión de modales
interface ModalState {
  mostrar: boolean;
  datos: ConfirmacionModalData;
}

@Component({
  selector: 'app-empleados-formulario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmacionModalComponent,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule
  ],
  templateUrl: './empleados-formulario.component.html',
  styleUrl: './empleados-formulario.component.scss'
})
export class EmpleadosFormularioComponent implements OnInit, OnDestroy {
  @Output() registroGuardado = new EventEmitter<void>();

  // Configuración de empleados
  readonly empleados = ['Farzin', 'Saul', 'Evelyn'] as const;
  readonly empleadosInfo: EmpleadoInfo[] = [
    {
      nombre: 'Farzin',
      diasLaborales: [0, 1, 2, 3, 4, 5, 6],
      fechasNomina: [1, 15],
      turnoPredeterminado: 'Noche'
    },
    {
      nombre: 'Saul',
      diasLaborales: [1, 2, 3, 4, 5, 6],
      fechasNomina: [6, 21],
      colorEspecial: '#ff6b6b',
      soloNomina: true
    },
    {
      nombre: 'Evelyn',
      diasLaborales: [0, 6],
      fechasNomina: [1, 15],
      diasFestivos: true
    }
  ];

  // Días festivos 2025
  readonly diasFestivos2025 = [
    '2025-01-01', '2025-01-06', '2025-02-17', '2025-04-17', '2025-04-18',
    '2025-05-01', '2025-05-05', '2025-09-16', '2025-11-02', '2025-11-20', '2025-12-25'
  ];

  // Estado del calendario
  currentDate = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.currentDate.getFullYear();

  // Datos cargados
  diasTrabajados: { [empleado: string]: DiaTrabajo[] } = {};
  registrosNomina: { [empleado: string]: RegistroNomina[] } = {};

  // Formularios
  nuevoRegistroNomina: Omit<RegistroNomina, 'id'> = {
    fecha: '',
    empleado: '',
    monto: 0,
    observaciones: '',
    pagoRealizado: false
  };

  // Date range for payroll
  fechaRango = {
    inicio: null as Date | null,
    fin: null as Date | null
  };

  nuevoRegistroTrabajo: Omit<EmpleadoRegistro, 'id'> = {
    fecha: '',
    empleado: '',
    turno: 'Día',
    pago: false
  };

  // Gestión unificada de modales
  modales: { [key in ModalType]: ModalState } = {
    [ModalType.CONFIRMATION]: {
      mostrar: false,
      datos: {
        titulo: 'Confirmar Acción',
        mensaje: '¿Estás seguro de que quieres realizar esta acción?',
        tipo: 'guardar',
        textoBotonConfirmar: 'Confirmar',
        textoBotonCancelar: 'Cancelar'
      }
    },
    [ModalType.SUCCESS]: {
      mostrar: false,
      datos: {
        titulo: 'Éxito',
        mensaje: 'Operación realizada exitosamente',
        tipo: 'confirmar',
        textoBotonConfirmar: 'Aceptar'
      }
    },
    [ModalType.ERROR]: {
      mostrar: false,
      datos: {
        titulo: 'Error',
        mensaje: 'Ha ocurrido un error',
        tipo: 'confirmar',
        textoBotonConfirmar: 'Aceptar'
      }
    },
    [ModalType.VALIDATION]: {
      mostrar: false,
      datos: {
        titulo: 'Validación',
        mensaje: 'Por favor completa todos los campos requeridos',
        tipo: 'confirmar',
        textoBotonConfirmar: 'Aceptar'
      }
    }
  };

  // Callbacks para modales
  private modalCallbacks: { [key in ModalType]?: () => void } = {};

  // Inyecciones
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== MÉTODOS DE CARGA DE DATOS =====
  async cargarDatos(): Promise<void> {
    try {
      await Promise.all([
        this.cargarDiasTrabajados(),
        this.cargarRegistrosNomina()
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.mostrarError('Error al cargar los datos');
    }
  }

  private async cargarDiasTrabajados(): Promise<void> {
    const registrosRef = collection(this.firestore, 'empleados');
    const querySnapshot = await getDocs(registrosRef);

    this.diasTrabajados = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data() as EmpleadoRegistro;
      if (!this.diasTrabajados[data.empleado]) {
        this.diasTrabajados[data.empleado] = [];
      }
      this.diasTrabajados[data.empleado].push({
        fecha: data.fecha,
        turno: data.turno,
        pago: data.pago
      });
    });
  }

  private async cargarRegistrosNomina(): Promise<void> {
    const nominaRef = collection(this.firestore, 'nomina');
    const nominaSnapshot = await getDocs(nominaRef);

    this.registrosNomina = {};
    nominaSnapshot.forEach((doc) => {
      const data = doc.data() as RegistroNomina;
      if (!this.registrosNomina[data.empleado]) {
        this.registrosNomina[data.empleado] = [];
      }
      this.registrosNomina[data.empleado].push({
        id: doc.id,
        fecha: data.fecha,
        empleado: data.empleado,
        monto: data.monto,
        observaciones: data.observaciones,
        pagoRealizado: data.pagoRealizado
      });
    });
  }

  // ===== MÉTODOS DEL CALENDARIO =====
  getDiasDelMes(): (Date | null)[] {
    const primerDia = new Date(this.currentYear, this.currentMonth, 1);
    const ultimoDia = new Date(this.currentYear, this.currentMonth + 1, 0);
    const dias: (Date | null)[] = [];

    // Días vacíos al inicio
    const primerDiaSemana = primerDia.getDay();
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }

    // Días del mes
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push(new Date(this.currentYear, this.currentMonth, i));
    }

    return dias;
  }

  cambiarMes(direccion: number): void {
    this.currentMonth += direccion;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
  }

  getNombreMes(): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[this.currentMonth];
  }

  // ===== MÉTODOS DE VALIDACIÓN =====
  getEmpleadoInfo(empleado: string): EmpleadoInfo | undefined {
    return this.empleadosInfo.find(info => info.nombre === empleado);
  }

  isDiaLaboral(fecha: Date, empleado: string): boolean {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    if (!empleadoInfo) return false;

    const esDiaLaboralRegular = empleadoInfo.diasLaborales.includes(fecha.getDay());
    const esDiaFestivo = this.isDiaFestivo(fecha);
    const trabajaDiasFestivos = empleadoInfo.diasFestivos || false;

    return esDiaLaboralRegular || (esDiaFestivo && trabajaDiasFestivos);
  }

  private isDiaFestivo(fecha: Date): boolean {
    const fechaStr = fecha.toISOString().split('T')[0];
    return this.diasFestivos2025.includes(fechaStr);
  }

  isSoloNomina(empleado: string): boolean {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    return empleadoInfo?.soloNomina || false;
  }

  isFechaNomina(fecha: Date, empleado: string): boolean {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    return empleadoInfo?.fechasNomina.includes(fecha.getDate()) || false;
  }

  // ===== MÉTODOS DE ESTADO DE DÍAS =====
  isDiaTrabajado(fecha: Date | null, empleado: string): DiaTrabajo | null {
    if (!fecha || !this.diasTrabajados[empleado]) return null;

    const fechaStr = fecha.toISOString().split('T')[0];
    return this.diasTrabajados[empleado].find(dia => dia.fecha === fechaStr) || null;
  }

  isNominaRecibida(fecha: Date, empleado: string): RegistroNomina | null {
    if (!this.registrosNomina[empleado]) return null;

    const fechaStr = fecha.toISOString().split('T')[0];
    return this.registrosNomina[empleado].find(registro => registro.fecha === fechaStr) || null;
  }

  isNominaPagada(fecha: Date, empleado: string): boolean {
    const nominaRecibida = this.isNominaRecibida(fecha, empleado);
    return nominaRecibida?.pagoRealizado || false;
  }

  // ===== MÉTODOS DE CLASES CSS =====
  getClaseDia(fecha: Date | null, empleado: string): string {
    if (!fecha) return 'dia-vacio';

    const clases: string[] = [];
    const diaTrabajo = this.isDiaTrabajado(fecha, empleado);
    const nominaPagada = this.isNominaPagada(fecha, empleado);
    const esDiaLaboral = this.isDiaLaboral(fecha, empleado);
    const esFechaNomina = this.isFechaNomina(fecha, empleado);
    const esDiaFestivo = this.isDiaFestivo(fecha);

    if (this.isSoloNomina(empleado)) {
      // Lógica para empleados que solo registran nómina
      if (nominaPagada) {
        clases.push('nomina-recibida');
      } else if (esFechaNomina) {
        clases.push('fecha-nomina-pendiente');
      }
    } else {
      // Lógica para empleados que trabajan
      if (diaTrabajo) {
        clases.push('dia-trabajado');
        if (diaTrabajo.pago) clases.push('pago-realizado');
        if (diaTrabajo.turno === 'Noche') clases.push('turno-noche');
      } else if (esDiaLaboral) {
        clases.push('dia-laboral');
      }

      if (nominaPagada) clases.push('nomina-recibida');
    }

    if (esFechaNomina) clases.push('fecha-nomina');
    if (esDiaFestivo) clases.push('dia-festivo');

    return clases.join(' ');
  }

  esDiaClickeable(fecha: Date | null, empleado: string): boolean {
    if (!fecha || this.isSoloNomina(empleado)) return false;
    return this.isDiaLaboral(fecha, empleado);
  }

  // ===== MÉTODOS DE INFORMACIÓN =====
    getDiasLaboralesTexto(empleado: string): string {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    if (!empleadoInfo) return 'No definido';

    const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let texto = empleadoInfo.diasLaborales.map(dia => diasNombres[dia]).join(', ');

    if (empleadoInfo.diasFestivos) {
      texto += ' + festivos';
    }

    return texto;
  }

    getFechasNominaTexto(empleado: string): string {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    if (!empleadoInfo) return 'No definido';
    return empleadoInfo.fechasNomina.join(' y ');
  }

  getTurnoPredeterminado(empleado: string): 'Día' | 'Noche' | null {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    return empleadoInfo?.turnoPredeterminado || null;
  }

  // ===== MÉTODOS DE TOOLTIP =====
        getTooltipDia(fecha: Date | null, empleado: string): string {
    if (!fecha) return '';

    const tooltipParts: string[] = [`${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`];

    const diaTrabajo = this.isDiaTrabajado(fecha, empleado);
    const nominaRecibida = this.isNominaRecibida(fecha, empleado);
    const nominaPagada = this.isNominaPagada(fecha, empleado);
    const esDiaLaboral = this.isDiaLaboral(fecha, empleado);
    const esFechaNomina = this.isFechaNomina(fecha, empleado);
    const esDiaFestivo = this.isDiaFestivo(fecha);

    if (this.isSoloNomina(empleado)) {
      if (nominaPagada) {
        tooltipParts.push('Nómina pagada');
        if (nominaRecibida?.monto) tooltipParts.push(`($${nominaRecibida.monto})`);
        if (nominaRecibida?.observaciones) tooltipParts.push(nominaRecibida.observaciones);
      } else if (nominaRecibida) {
        tooltipParts.push('Nómina registrada (pendiente)');
        if (nominaRecibida.monto) tooltipParts.push(`($${nominaRecibida.monto})`);
        if (nominaRecibida.observaciones) tooltipParts.push(nominaRecibida.observaciones);
      } else if (esFechaNomina) {
        tooltipParts.push('Fecha de nómina (sin registrar)');
      } else {
        tooltipParts.push('No es fecha de nómina');
      }
    } else {
      if (diaTrabajo) {
        tooltipParts.push(`Trabajó (${diaTrabajo.turno})`);
        tooltipParts.push(diaTrabajo.pago ? 'Pago realizado' : 'Pago pendiente');
      } else if (esDiaLaboral) {
        tooltipParts.push('Día laboral (no registrado)');
      } else {
        tooltipParts.push('No es día laboral');
      }

      if (nominaPagada) {
        tooltipParts.push('Nómina pagada');
        if (nominaRecibida?.monto) tooltipParts.push(`($${nominaRecibida.monto})`);
        if (nominaRecibida?.observaciones) tooltipParts.push(nominaRecibida.observaciones);
      } else if (nominaRecibida) {
        tooltipParts.push('Nómina registrada (pendiente)');
        if (nominaRecibida.monto) tooltipParts.push(`($${nominaRecibida.monto})`);
        if (nominaRecibida.observaciones) tooltipParts.push(nominaRecibida.observaciones);
      }

      if (esFechaNomina) tooltipParts.push('Fecha de nómina');
    }

    if (esDiaFestivo) tooltipParts.push('Día festivo');

    return tooltipParts.join(' - ');
  }

  // ===== MÉTODOS DE GESTIÓN DE MODALES =====
  private mostrarModal(tipo: ModalType, mensaje: string, callback?: () => void): void {
    // Cerrar cualquier modal abierto primero
    this.cerrarTodosLosModales();

    // Actualizar datos del modal
    this.modales[tipo].datos.mensaje = mensaje;

    // Guardar callback si existe
    if (callback) {
      this.modalCallbacks[tipo] = callback;
    }

    // Mostrar modal
    this.modales[tipo].mostrar = true;
  }

  // Método específico para mostrar mensajes de éxito
  private mostrarExito(mensaje: string): void {
    this.cerrarTodosLosModales();
    this.modales[ModalType.SUCCESS].datos.mensaje = mensaje;
    this.modales[ModalType.SUCCESS].mostrar = true;
  }

  // Método específico para mostrar errores
  private mostrarError(mensaje: string): void {
    this.cerrarTodosLosModales();
    this.modales[ModalType.ERROR].datos.mensaje = mensaje;
    this.modales[ModalType.ERROR].mostrar = true;
  }

  private cerrarTodosLosModales(): void {
    Object.values(ModalType).forEach(tipo => {
      this.modales[tipo].mostrar = false;
    });
    this.modalCallbacks = {};
  }

  private cerrarModal(tipo: ModalType): void {
    this.modales[tipo].mostrar = false;
    if (this.modalCallbacks[tipo]) {
      delete this.modalCallbacks[tipo];
    }
  }

  onModalConfirmar(tipo: string): void {
    try {
      const modalType = tipo as ModalType;
      const callback = this.modalCallbacks[modalType];

      // Cerrar modal primero
      this.cerrarModal(modalType);

      // Ejecutar callback si existe
      if (callback) {
        callback();
      }
    } catch (error) {
      console.error('Error en onModalConfirmar:', error);
    }
  }

  onModalCancelar(tipo: string): void {
    try {
      this.cerrarModal(tipo as ModalType);
    } catch (error) {
      console.error('Error en onModalCancelar:', error);
    }
  }

  onModalCerrar(tipo: string): void {
    try {
      this.cerrarModal(tipo as ModalType);
    } catch (error) {
      console.error('Error en onModalCerrar:', error);
    }
  }

  // ===== MÉTODOS DE NÓMINA =====
  async agregarNomina(): Promise<void> {
    try {
      const { empleado } = this.nuevoRegistroNomina;

      if (!this.fechaRango.inicio || !this.fechaRango.fin || !empleado) {
        this.mostrarModal(ModalType.VALIDATION, 'Por favor completa todos los campos requeridos');
        return;
      }

      if (this.fechaRango.inicio > this.fechaRango.fin) {
        this.mostrarError('La fecha de inicio no puede ser mayor que la fecha de fin');
        return;
      }

      // Mostrar confirmación
      const fechaInicio = this.fechaRango.inicio.toLocaleDateString('es-ES');
      const fechaFin = this.fechaRango.fin.toLocaleDateString('es-ES');

      this.mostrarModal(
        ModalType.CONFIRMATION,
        `¿Registrar nómina para ${empleado} del ${fechaInicio} al ${fechaFin}?`,
        () => this.confirmarAgregarNomina()
      );
    } catch (error) {
      console.error('Error en agregarNomina:', error);
      this.mostrarError('Error al procesar la solicitud');
    }
  }

  private async confirmarAgregarNomina(): Promise<void> {
    try {
      const { empleado, monto, observaciones, pagoRealizado } = this.nuevoRegistroNomina;

      // Crear registros para cada fecha en el rango
      const registros: Omit<RegistroNomina, 'id'>[] = [];
      const fechaInicio = new Date(this.fechaRango.inicio!);
      const fechaFin = new Date(this.fechaRango.fin!);

      for (let fecha = new Date(fechaInicio); fecha <= fechaFin; fecha.setDate(fecha.getDate() + 1)) {
        const registro = {
          fecha: fecha.toISOString().split('T')[0],
          empleado,
          monto: monto || 0,
          observaciones: observaciones || '',
          pagoRealizado: pagoRealizado || false
        };
        registros.push(registro);
      }

      // Guardar todos los registros en Firebase
      const batch = [];
      for (const registro of registros) {
        batch.push(addDoc(collection(this.firestore, 'nomina'), registro));
      }

      await Promise.all(batch);

      // Recargar datos y limpiar formulario
      await this.cargarRegistrosNomina();
      this.limpiarFormularioNomina();
      this.registroGuardado.emit();

      // Mostrar mensaje de éxito
      const diasRegistrados = registros.length;
      setTimeout(() => {
        this.mostrarExito(`${diasRegistrados} registros de nómina agregados exitosamente para ${empleado}`);
      }, 100);

    } catch (error) {
      console.error('Error al agregar nómina:', error);
      setTimeout(() => {
        this.mostrarError(`Error al agregar los registros de nómina: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }, 100);
    }
  }

  private limpiarFormularioNomina(): void {
    this.nuevoRegistroNomina = {
      fecha: '',
      empleado: '',
      monto: 0,
      observaciones: '',
      pagoRealizado: false
    };
    this.fechaRango = {
      inicio: null,
      fin: null
    };
  }

  // ===== MÉTODOS DE DÍAS TRABAJADOS =====
  seleccionarDia(fecha: Date, empleado: string): void {
    if (this.isSoloNomina(empleado)) return;

    const diaExistente = this.isDiaTrabajado(fecha, empleado);

    if (diaExistente) {
      this.eliminarDiaTrabajado(fecha, empleado);
    } else {
      this.crearNuevoRegistroTrabajo(fecha, empleado);
    }
  }

  private crearNuevoRegistroTrabajo(fecha: Date, empleado: string): void {
    this.nuevoRegistroTrabajo = {
      fecha: fecha.toISOString().split('T')[0],
      empleado,
      turno: this.getTurnoPredeterminado(empleado) || 'Día',
      pago: false
    };

    const fechaFormateada = fecha.toLocaleDateString('es-ES');
    this.mostrarModal(
      ModalType.CONFIRMATION,
      `¿Registrar día trabajado para ${empleado} el ${fechaFormateada}?`,
      () => this.confirmarRegistroTrabajo()
    );
  }

  private async confirmarRegistroTrabajo(): Promise<void> {
    try {
      // Guardar registro directamente
      await addDoc(collection(this.firestore, 'empleados'), this.nuevoRegistroTrabajo);

      // Recargar datos y limpiar formulario
      await this.cargarDiasTrabajados();
      this.limpiarFormularioTrabajo();
      this.registroGuardado.emit();

      setTimeout(() => {
        this.mostrarExito('Día trabajado registrado exitosamente');
      }, 100);
    } catch (error) {
      console.error('Error al registrar trabajo:', error);
      setTimeout(() => {
        this.mostrarError('Error al registrar el día trabajado');
      }, 100);
    }
  }

  private async eliminarDiaTrabajado(fecha: Date, empleado: string): Promise<void> {
    try {
      const fechaStr = fecha.toISOString().split('T')[0];
      const registrosRef = collection(this.firestore, 'empleados');
      const q = query(registrosRef, where('fecha', '==', fechaStr), where('empleado', '==', empleado));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await deleteDoc(docRef);
      }

      await this.cargarDiasTrabajados();
      this.registroGuardado.emit();

      setTimeout(() => {
        this.mostrarExito('Día trabajado eliminado exitosamente');
      }, 100);
    } catch (error) {
      console.error('Error al eliminar trabajo:', error);
      setTimeout(() => {
        this.mostrarError('Error al eliminar el día trabajado');
      }, 100);
    }
  }

  private limpiarFormularioTrabajo(): void {
    this.nuevoRegistroTrabajo = {
      fecha: '',
      empleado: '',
      turno: 'Día',
      pago: false
    };
  }

}
