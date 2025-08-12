import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, doc } from '@angular/fire/firestore';
import { ConfirmacionModalComponent } from '../confirmacion-modal/confirmacion-modal.component';
import { Subject } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';

// Interfaces optimizadas
export interface EmpleadoRegistro {
  id?: string;
  fecha: string;
  empleado: string;
  turno: 'Día' | 'Noche';
  pago: boolean;
  monto?: number;
  observaciones?: string;
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
  diasLaborales: number[];
  fechasNomina: number[];
  turnoPredeterminado?: 'Día' | 'Noche';
  diasFestivos?: boolean;
  soloNomina?: boolean;
  salarioPorDia?: number;
}

export interface ModalData {
  titulo: string;
  mensaje: string;
  tipo: 'confirmar' | 'guardar';
  textoBotonConfirmar: string;
  textoBotonCancelar: string;
}

export interface FechaRango {
  inicio: Date | null;
  fin: Date | null;
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
      turnoPredeterminado: 'Noche',
      salarioPorDia: 300
    },
    {
      nombre: 'Saul',
      diasLaborales: [1, 2, 3, 4, 5, 6],
      fechasNomina: [6, 21],
      soloNomina: true,
      salarioPorDia: 250
    },
    {
      nombre: 'Evelyn',
      diasLaborales: [0, 6],
      fechasNomina: [1, 15],
      diasFestivos: true,
      salarioPorDia: 280
    }
  ];

  // Días festivos 2025
  readonly diasFestivos2025 = [
    '2025-01-01', '2025-01-06', '2025-02-17', '2025-04-17', '2025-04-18',
    '2025-05-01', '2025-05-05', '2025-09-16', '2025-11-02', '2025-11-20', '2025-12-25'
  ];

  // Estado del calendario
  readonly currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  // Datos cargados
  diasTrabajados: { [empleado: string]: EmpleadoRegistro[] } = {};
  registrosNomina: { [empleado: string]: RegistroNomina[] } = {};

  // Formularios
  nuevoRegistroNomina: Omit<RegistroNomina, 'id'> = {
    fecha: '',
    empleado: '',
    monto: 0,
    observaciones: '',
    pagoRealizado: false
  };

  fechaRango: FechaRango = {
    inicio: null,
    fin: null
  };

  nuevoRegistroTrabajo: Omit<EmpleadoRegistro, 'id'> = {
    fecha: '',
    empleado: '',
    turno: 'Día',
    pago: false
  };

  // Gestión de modales
  modalActual = {
    mostrar: false,
    datos: {} as ModalData
  };

  private callbackConfirmacion?: () => void;
  private firestore = inject(Firestore);
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
        id: doc.id,
        ...data
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
        ...data
      });
    });
  }

  // ===== MÉTODOS DEL CALENDARIO =====
  getDiasDelMes(): (Date | null)[] {
    const primerDia = new Date(this.currentYear, this.currentMonth, 1);
    const ultimoDia = new Date(this.currentYear, this.currentMonth + 1, 0);
    const dias: (Date | null)[] = [];

    // Agregar días vacíos al inicio
    const primerDiaSemana = primerDia.getDay();
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }

    // Agregar días del mes
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
  isDiaTrabajado(fecha: Date | null, empleado: string): EmpleadoRegistro | null {
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

  // ===== NUEVOS MÉTODOS PARA PAGOS =====
  async marcarPagoDia(fecha: Date, empleado: string): Promise<void> {
    const diaTrabajado = this.isDiaTrabajado(fecha, empleado);
    if (!diaTrabajado) {
      this.mostrarError('No hay registro de trabajo para este día');
      return;
    }

    if (diaTrabajado.pago) {
      // Desmarcar pago
      this.mostrarModal(
        'Desmarcar Pago',
        `¿Desmarcar pago para ${empleado} el ${fecha.toLocaleDateString('es-ES')}?`,
        'guardar',
        () => this.confirmarDesmarcarPago(diaTrabajado)
      );
    } else {
      // Marcar pago
      this.mostrarModal(
        'Marcar Pago',
        `¿Marcar pago para ${empleado} el ${fecha.toLocaleDateString('es-ES')}?`,
        'guardar',
        () => this.confirmarMarcarPago(diaTrabajado)
      );
    }
  }

  private async confirmarMarcarPago(registro: EmpleadoRegistro): Promise<void> {
    try {
      if (!registro.id) {
        this.mostrarError('Error: ID de registro no encontrado');
        return;
      }

      const empleadoInfo = this.getEmpleadoInfo(registro.empleado);
      const monto = empleadoInfo?.salarioPorDia || 0;

      await updateDoc(doc(this.firestore, 'empleados', registro.id), {
        pago: true,
        monto: monto,
        observaciones: `Pago marcado el ${new Date().toLocaleDateString('es-ES')}`
      });

      await this.cargarDiasTrabajados();
      this.registroGuardado.emit();
      this.mostrarExito('Pago marcado exitosamente');
    } catch (error) {
      console.error('Error al marcar pago:', error);
      this.mostrarError('Error al marcar el pago');
    }
  }

  private async confirmarDesmarcarPago(registro: EmpleadoRegistro): Promise<void> {
    try {
      if (!registro.id) {
        this.mostrarError('Error: ID de registro no encontrado');
        return;
      }

      await updateDoc(doc(this.firestore, 'empleados', registro.id), {
        pago: false,
        monto: 0,
        observaciones: ''
      });

      await this.cargarDiasTrabajados();
      this.registroGuardado.emit();
      this.mostrarExito('Pago desmarcado exitosamente');
    } catch (error) {
      console.error('Error al desmarcar pago:', error);
      this.mostrarError('Error al desmarcar el pago');
    }
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

    // Lógica para empleados que solo registran nómina
    if (this.isSoloNomina(empleado)) {
      if (nominaPagada) {
        clases.push('nomina-recibida');
      } else if (esFechaNomina) {
        clases.push('fecha-nomina-pendiente');
      }
      return clases.join(' ');
    }

    // Lógica para empleados que trabajan
    if (diaTrabajo) {
      clases.push('dia-trabajado');
      if (diaTrabajo.pago) clases.push('pago-realizado');
      if (diaTrabajo.turno === 'Noche') clases.push('turno-noche');
    } else if (esDiaLaboral) {
      clases.push('dia-laboral');
    }

    if (nominaPagada) clases.push('nomina-recibida');
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

  // ===== MÉTODOS DE GESTIÓN DE MODALES =====
  private mostrarModal(titulo: string, mensaje: string, tipo: 'confirmar' | 'guardar' = 'confirmar', callback?: () => void): void {
    this.modalActual = {
      mostrar: true,
      datos: {
        titulo,
        mensaje,
        tipo,
        textoBotonConfirmar: tipo === 'guardar' ? 'Confirmar' : 'Aceptar',
        textoBotonCancelar: 'Cancelar'
      }
    };
    this.callbackConfirmacion = callback;
  }

  private mostrarExito(mensaje: string): void {
    this.mostrarModal('Éxito', mensaje, 'confirmar');
  }

  private mostrarError(mensaje: string): void {
    this.mostrarModal('Error', mensaje, 'confirmar');
  }

  onModalConfirmar(): void {
    this.modalActual.mostrar = false;
    if (this.callbackConfirmacion) {
      this.callbackConfirmacion();
      this.callbackConfirmacion = undefined;
    }
  }

  onModalCancelar(): void {
    this.modalActual.mostrar = false;
    this.callbackConfirmacion = undefined;
  }

  onModalCerrar(): void {
    this.modalActual.mostrar = false;
    this.callbackConfirmacion = undefined;
  }

  // ===== MÉTODOS DE NÓMINA =====
  async agregarNomina(): Promise<void> {
    try {
      const { empleado } = this.nuevoRegistroNomina;

      if (!this.fechaRango.inicio || !this.fechaRango.fin || !empleado) {
        this.mostrarError('Por favor completa todos los campos requeridos');
        return;
      }

      if (this.fechaRango.inicio > this.fechaRango.fin) {
        this.mostrarError('La fecha de inicio no puede ser mayor que la fecha de fin');
        return;
      }

      const fechaInicio = this.fechaRango.inicio.toLocaleDateString('es-ES');
      const fechaFin = this.fechaRango.fin.toLocaleDateString('es-ES');

      this.mostrarModal(
        'Confirmar Nómina',
        `¿Registrar nómina para ${empleado} del ${fechaInicio} al ${fechaFin}?`,
        'guardar',
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

      const batch = registros.map(registro =>
        addDoc(collection(this.firestore, 'nomina'), registro)
      );

      await Promise.all(batch);
      await this.cargarRegistrosNomina();
      this.limpiarFormularioNomina();
      this.registroGuardado.emit();

      this.mostrarExito(`${registros.length} registros de nómina agregados exitosamente para ${empleado}`);

    } catch (error) {
      console.error('Error al agregar nómina:', error);
      this.mostrarError(`Error al agregar los registros de nómina: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      // Si ya existe, permitir marcar/desmarcar pago o eliminar
      if (diaExistente.pago) {
        this.marcarPagoDia(fecha, empleado);
      } else {
        this.mostrarOpcionesDiaTrabajado(fecha, empleado, diaExistente);
      }
    } else {
      this.crearNuevoRegistroTrabajo(fecha, empleado);
    }
  }

  private mostrarOpcionesDiaTrabajado(fecha: Date, empleado: string, registro: EmpleadoRegistro): void {
    const fechaFormateada = fecha.toLocaleDateString('es-ES');
    this.mostrarModal(
      'Opciones del Día Trabajado',
      `¿Qué deseas hacer con el día trabajado de ${empleado} el ${fechaFormateada}?`,
      'confirmar',
      () => this.mostrarOpcionesAvanzadas(fecha, empleado, registro)
    );
  }

  private mostrarOpcionesAvanzadas(fecha: Date, empleado: string, registro: EmpleadoRegistro): void {
    // Aquí podrías implementar un modal con múltiples opciones
    // Por ahora, simplemente marcar como pagado
    this.marcarPagoDia(fecha, empleado);
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
      'Confirmar Trabajo',
      `¿Registrar día trabajado para ${empleado} el ${fechaFormateada}?`,
      'guardar',
      () => this.confirmarRegistroTrabajo()
    );
  }

  private async confirmarRegistroTrabajo(): Promise<void> {
    try {
      await addDoc(collection(this.firestore, 'empleados'), this.nuevoRegistroTrabajo);

      await this.cargarDiasTrabajados();
      this.limpiarFormularioTrabajo();
      this.registroGuardado.emit();

      this.mostrarExito('Día trabajado registrado exitosamente');
    } catch (error) {
      console.error('Error al registrar trabajo:', error);
      this.mostrarError('Error al registrar el día trabajado');
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

      this.mostrarExito('Día trabajado eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar trabajo:', error);
      this.mostrarError('Error al eliminar el día trabajado');
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

  // ===== MÉTODOS DE RESUMEN Y ESTADÍSTICAS =====
  getResumenEmpleado(empleado: string): { diasTrabajados: number; diasPagados: number; totalPagos: number } {
    const diasTrabajados = this.diasTrabajados[empleado] || [];
    const diasPagados = diasTrabajados.filter(dia => dia.pago).length;
    const totalPagos = diasPagados * (this.getEmpleadoInfo(empleado)?.salarioPorDia || 0);

    return {
      diasTrabajados: diasTrabajados.length,
      diasPagados,
      totalPagos
    };
  }

  getDiasTrabajadosMes(empleado: string): number {
    if (!this.diasTrabajados[empleado]) return 0;

    return this.diasTrabajados[empleado].filter(dia => {
      const fecha = new Date(dia.fecha);
      return fecha.getMonth() === this.currentMonth && fecha.getFullYear() === this.currentYear;
    }).length;
  }

  getDiasPagadosMes(empleado: string): number {
    if (!this.diasTrabajados[empleado]) return 0;

    return this.diasTrabajados[empleado].filter(dia => {
      const fecha = new Date(dia.fecha);
      return fecha.getMonth() === this.currentMonth &&
             fecha.getFullYear() === this.currentYear &&
             dia.pago;
    }).length;
  }

  getTotalPagosMes(empleado: string): number {
    const diasPagados = this.getDiasPagadosMes(empleado);
    const salarioPorDia = this.getEmpleadoInfo(empleado)?.salarioPorDia || 0;
    return diasPagados * salarioPorDia;
  }

  // ===== MÉTODOS DE PAGOS MASIVOS =====
  async pagarDiasPendientes(empleado: string): Promise<void> {
    if (this.isSoloNomina(empleado)) {
      this.mostrarError('Los empleados que solo registran nómina no tienen días trabajados para pagar');
      return;
    }

    const diasTrabajados = this.diasTrabajados[empleado] || [];
    const diasPendientes = diasTrabajados.filter(dia => !dia.pago);

    if (diasPendientes.length === 0) {
      this.mostrarExito('No hay días pendientes de pago para este empleado');
      return;
    }

    const empleadoInfo = this.getEmpleadoInfo(empleado);
    const totalPagar = diasPendientes.length * (empleadoInfo?.salarioPorDia || 0);

    this.mostrarModal(
      'Pagar Días Pendientes',
      `¿Pagar ${diasPendientes.length} días pendientes de ${empleado} por un total de $${totalPagar}?`,
      'guardar',
      () => this.confirmarPagoMasivo(diasPendientes)
    );
  }

  private async confirmarPagoMasivo(diasPendientes: EmpleadoRegistro[]): Promise<void> {
    try {
      const empleadoInfo = this.getEmpleadoInfo(diasPendientes[0].empleado);
      const monto = empleadoInfo?.salarioPorDia || 0;
      const fechaPago = new Date().toLocaleDateString('es-ES');

      const actualizaciones = diasPendientes.map(registro => {
        if (!registro.id) return Promise.resolve();

        return updateDoc(doc(this.firestore, 'empleados', registro.id), {
          pago: true,
          monto: monto,
          observaciones: `Pago masivo realizado el ${fechaPago}`
        });
      });

      await Promise.all(actualizaciones);
      await this.cargarDiasTrabajados();
      this.registroGuardado.emit();

      this.mostrarExito(`${diasPendientes.length} días marcados como pagados exitosamente`);
    } catch (error) {
      console.error('Error al realizar pago masivo:', error);
      this.mostrarError('Error al realizar el pago masivo');
    }
  }

  getDiasPendientesPago(empleado: string): number {
    if (!this.diasTrabajados[empleado]) return 0;
    return this.diasTrabajados[empleado].filter(dia => !dia.pago).length;
  }
}
