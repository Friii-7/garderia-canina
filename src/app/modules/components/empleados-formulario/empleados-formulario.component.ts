import { Component, EventEmitter, Output, NgZone, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { ConfirmacionModalComponent, ConfirmacionModalData } from '../confirmacion-modal/confirmacion-modal.component';

export interface EmpleadoRegistro {
  id?: string;
  fecha: string;
  empleado: string;
  turno: string;
  pago: boolean;
}

export interface DiaTrabajo {
  fecha: string;
  turno: string;
  pago: boolean;
}

export interface RegistroNomina {
  id?: string;
  fecha?: string; // Mantener para compatibilidad
  fechaInicio?: string;
  fechaFin?: string;
  empleado: string;
  monto?: number;
  observaciones?: string;
}

export interface EmpleadoInfo {
  nombre: string;
  diasLaborales: number[]; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  fechasNomina: number[]; // Días del mes para pago de nómina
  colorEspecial?: string;
  turnoPredeterminado?: string; // Turno predeterminado para el empleado
  diasFestivos?: boolean; // Si incluye días festivos
  soloNomina?: boolean; // Si solo registra nómina, no días de trabajo
}

@Component({
  selector: 'app-empleados-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionModalComponent],
  templateUrl: './empleados-formulario.component.html',
  styleUrl: './empleados-formulario.component.scss'
})
export class EmpleadosFormularioComponent implements OnInit {
  @Output() registroGuardado = new EventEmitter<void>();

  empleados = ['Farzin', 'Saul', 'Evelyn'];
  empleadoSeleccionado: string = '';

  // Información específica de cada empleado
  empleadosInfo: EmpleadoInfo[] = [
    {
      nombre: 'Farzin',
      diasLaborales: [0, 1, 2, 3, 4, 5, 6], // Todos los días
      fechasNomina: [1, 15],
      turnoPredeterminado: 'Noche' // Solo turno noche
    },
    {
      nombre: 'Saul',
      diasLaborales: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
      fechasNomina: [6, 21],
      colorEspecial: '#ff6b6b',
      soloNomina: true // Solo registra nómina
    },
    {
      nombre: 'Evelyn',
      diasLaborales: [0, 6], // Solo domingos y sábados
      fechasNomina: [1, 15],
      diasFestivos: true // Incluye días festivos
    }
  ];

  // Calendario
  currentDate = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.currentDate.getFullYear();
  diasTrabajados: { [empleado: string]: DiaTrabajo[] } = {};
  registrosNomina: { [empleado: string]: RegistroNomina[] } = {};

  // Días festivos 2025 (formato: 'YYYY-MM-DD')
  diasFestivos2025 = [
    '2025-01-01', // Año Nuevo
    '2025-01-06', // Día de Reyes
    '2025-02-17', // Lunes de Carnaval
    '2025-04-17', // Jueves Santo
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Día del Trabajo
    '2025-05-05', // Cinco de Mayo
    '2025-09-16', // Día de la Independencia
    '2025-11-02', // Día de los Muertos
    '2025-11-20', // Día de la Revolución
    '2025-12-25', // Navidad
  ];



  // Formulario para agregar nómina
  nuevoRegistroNomina: RegistroNomina = {
    fechaInicio: '',
    fechaFin: '',
    empleado: '',
    monto: 0,
    observaciones: ''
  };

  // Modal de confirmación
  mostrarModal = false;
  datosModal: ConfirmacionModalData = {
    titulo: 'Confirmar Nómina',
    mensaje: '¿Estás seguro de que quieres agregar estos registros de nómina?',
    tipo: 'guardar'
  };

  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  ngOnInit() {
    this.cargarDiasTrabajados();
  }

  async cargarDiasTrabajados() {
    try {
      // Cargar días trabajados
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

      // Cargar registros de nómina
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
          observaciones: data.observaciones
        });
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }

  getDiasDelMes(): (Date | null)[] {
    const primerDia = new Date(this.currentYear, this.currentMonth, 1);
    const ultimoDia = new Date(this.currentYear, this.currentMonth + 1, 0);
    const dias: (Date | null)[] = [];

    // Agregar días vacíos al inicio para alinear con los días de la semana
    const primerDiaSemana = primerDia.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }

    // Agregar todos los días del mes
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push(new Date(this.currentYear, this.currentMonth, i));
    }

    return dias;
  }

  getDiaSemana(fecha: Date): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[fecha.getDay()];
  }

  isDiaTrabajado(fecha: Date | null, empleado: string): DiaTrabajo | null {
    if (!fecha || !this.diasTrabajados[empleado]) return null;

    const fechaStr = fecha.toISOString().split('T')[0];
    return this.diasTrabajados[empleado].find(dia => dia.fecha === fechaStr) || null;
  }

        getClaseDia(fecha: Date | null, empleado: string): string {
    if (!fecha) return 'dia-vacio';

    const diaTrabajo = this.isDiaTrabajado(fecha, empleado);
    const nominaRecibida = this.isNominaRecibida(fecha, empleado);
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    let clase = '';

    // Verificar si es un día laboral para este empleado
    const esDiaLaboral = this.isDiaLaboral(fecha, empleado);

    // Verificar si es fecha de nómina
    const esFechaNomina = empleadoInfo?.fechasNomina.includes(fecha.getDate()) || false;

    // Verificar si es día festivo
    const esDiaFestivo = this.isDiaFestivo(fecha);

    // Si el empleado solo registra nómina (Saul)
    if (this.isSoloNomina(empleado)) {
      if (nominaRecibida) {
        clase = 'nomina-recibida';
      } else if (esFechaNomina) {
        clase = 'fecha-nomina-pendiente';
      }
    } else {
      // Lógica para empleados que trabajan (Farzin y Evelyn)
      if (diaTrabajo) {
        clase = 'dia-trabajado';
        if (diaTrabajo.pago) {
          clase += ' pago-realizado';
        }
        if (diaTrabajo.turno === 'Noche') {
          clase += ' turno-noche';
        }
      } else if (esDiaLaboral) {
        clase = 'dia-laboral';
      }

      // Agregar clase de nómina si recibió nómina en ese día
      if (nominaRecibida) {
        clase += ' nomina-recibida';
      }
    }

    // Agregar fecha de nómina para todos
    if (esFechaNomina) {
      clase += ' fecha-nomina';
    }

    if (esDiaFestivo) {
      clase += ' dia-festivo';
    }

    return clase;
  }

  getEmpleadoInfo(empleado: string): EmpleadoInfo | undefined {
    return this.empleadosInfo.find(info => info.nombre === empleado);
  }

  isDiaLaboral(fecha: Date, empleado: string): boolean {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    if (!empleadoInfo) return false;

    // Verificar si es un día laboral regular
    const esDiaLaboralRegular = empleadoInfo.diasLaborales.includes(fecha.getDay());

    // Verificar si es día festivo y el empleado trabaja días festivos
    const esDiaFestivo = this.isDiaFestivo(fecha);
    const trabajaDiasFestivos = empleadoInfo.diasFestivos || false;

    return esDiaLaboralRegular || (esDiaFestivo && trabajaDiasFestivos);
  }

  isDiaFestivo(fecha: Date): boolean {
    const fechaStr = fecha.toISOString().split('T')[0];
    return this.diasFestivos2025.includes(fechaStr);
  }

  isFechaNomina(fecha: Date, empleado: string): boolean {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    return empleadoInfo?.fechasNomina.includes(fecha.getDate()) || false;
  }

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

  getTurnoPredeterminado(empleado: string): string | null {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    return empleadoInfo?.turnoPredeterminado || null;
  }

  isSoloNomina(empleado: string): boolean {
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    return empleadoInfo?.soloNomina || false;
  }

  isNominaRecibida(fecha: Date, empleado: string): RegistroNomina | null {
    if (!this.registrosNomina[empleado]) return null;

    const fechaStr = fecha.toISOString().split('T')[0];
    return this.registrosNomina[empleado].find(registro => registro.fecha === fechaStr) || null;
  }

  async agregarNomina() {
    if (this.nuevoRegistroNomina.fechaInicio && this.nuevoRegistroNomina.fechaFin && this.nuevoRegistroNomina.empleado) {
      // Validar que la fecha de fin no sea anterior a la de inicio
      const fechaInicio = new Date(this.nuevoRegistroNomina.fechaInicio);
      const fechaFin = new Date(this.nuevoRegistroNomina.fechaFin);

      if (fechaFin < fechaInicio) {
        alert('La fecha de fin no puede ser anterior a la fecha de inicio');
        return;
      }

      // Calcular número de días para el mensaje
      const fechas = [];
      const fechaActual = new Date(fechaInicio);
      while (fechaActual <= fechaFin) {
        fechas.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + 1);
      }

      // Actualizar mensaje del modal
      this.datosModal.mensaje = `¿Estás seguro de que quieres agregar registros de nómina para ${fechas.length} días (${this.nuevoRegistroNomina.empleado})?`;

      // Mostrar modal de confirmación
      this.mostrarModal = true;
    } else {
      alert('Por favor completa todos los campos requeridos');
    }
  }

  async confirmarAgregarNomina() {
    try {
      if (!this.nuevoRegistroNomina.fechaInicio || !this.nuevoRegistroNomina.fechaFin) {
        alert('Fechas no válidas');
        return;
      }

      const fechaInicio = new Date(this.nuevoRegistroNomina.fechaInicio);
      const fechaFin = new Date(this.nuevoRegistroNomina.fechaFin);

      // Generar todas las fechas en el rango
      const fechas = [];
      const fechaActual = new Date(fechaInicio);
      while (fechaActual <= fechaFin) {
        fechas.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + 1);
      }

      // Crear un registro para cada fecha
      for (const fecha of fechas) {
        const registro = {
          fecha: fecha.toISOString().split('T')[0],
          empleado: this.nuevoRegistroNomina.empleado,
          monto: this.nuevoRegistroNomina.monto,
          observaciones: this.nuevoRegistroNomina.observaciones
        };

        await this.ngZone.runOutsideAngular(async () => {
          await addDoc(collection(this.firestore, 'nomina'), registro);
        });
      }

      // Recargar datos
      await this.cargarDiasTrabajados();

      // Limpiar formulario
      this.nuevoRegistroNomina = {
        fechaInicio: '',
        fechaFin: '',
        empleado: '',
        monto: 0,
        observaciones: ''
      };

      this.registroGuardado.emit();
      this.mostrarModal = false;
      alert(`Registros de nómina agregados exitosamente para ${fechas.length} días`);
    } catch (error) {
      alert('Error al agregar los registros de nómina');
    }
  }

  cancelarAgregarNomina() {
    this.mostrarModal = false;
  }

  cambiarMes(direccion: number) {
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

        getTooltipDia(fecha: Date | null, empleado: string): string {
    if (!fecha) return '';

    const diaTrabajo = this.isDiaTrabajado(fecha, empleado);
    const nominaRecibida = this.isNominaRecibida(fecha, empleado);
    const empleadoInfo = this.getEmpleadoInfo(empleado);
    const esDiaLaboral = this.isDiaLaboral(fecha, empleado);
    const esFechaNomina = this.isFechaNomina(fecha, empleado);
    const esDiaFestivo = this.isDiaFestivo(fecha);

    let tooltip = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;

    // Si el empleado solo registra nómina (Saul)
    if (this.isSoloNomina(empleado)) {
      if (nominaRecibida) {
        tooltip += ` - Nómina recibida`;
        if (nominaRecibida.monto) {
          tooltip += ` ($${nominaRecibida.monto})`;
        }
        if (nominaRecibida.observaciones) {
          tooltip += ` - ${nominaRecibida.observaciones}`;
        }
      } else if (esFechaNomina) {
        tooltip += ' - Fecha de nómina (pendiente)';
      } else {
        tooltip += ' - No es fecha de nómina';
      }
    } else {
      // Lógica para empleados que trabajan (Farzin y Evelyn)
      if (diaTrabajo) {
        tooltip += ` - Trabajó (${diaTrabajo.turno})`;
        if (diaTrabajo.pago) {
          tooltip += ' - Pago realizado';
        } else {
          tooltip += ' - Pago pendiente';
        }
      } else if (esDiaLaboral) {
        tooltip += ' - Día laboral (no registrado)';
      } else {
        tooltip += ' - No es día laboral';
      }

      // Agregar información de nómina si recibió
      if (nominaRecibida) {
        tooltip += ' - Nómina recibida';
        if (nominaRecibida.monto) {
          tooltip += ` ($${nominaRecibida.monto})`;
        }
        if (nominaRecibida.observaciones) {
          tooltip += ` - ${nominaRecibida.observaciones}`;
        }
      }

      if (esFechaNomina) {
        tooltip += ' - Fecha de nómina';
      }
    }

    if (esDiaFestivo) {
      tooltip += ' - Día festivo';
    }

    return tooltip;
  }
}
