import { Component, EventEmitter, Output, NgZone, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';

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

@Component({
  selector: 'app-empleados-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleados-formulario.component.html',
  styleUrl: './empleados-formulario.component.scss'
})
export class EmpleadosFormularioComponent implements OnInit {
  @Output() registroGuardado = new EventEmitter<void>();

  empleados = ['Farzin', 'Saul', 'Evelyn'];
  turnos = ['Día', 'Noche'];
  empleadoSeleccionado: string = '';

  // Calendario
  currentDate = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.currentDate.getFullYear();
  diasTrabajados: { [empleado: string]: DiaTrabajo[] } = {};

  // Formulario para agregar día
  nuevoDia: EmpleadoRegistro = {
    fecha: '',
    empleado: '',
    turno: '',
    pago: false
  };

  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  ngOnInit() {
    this.cargarDiasTrabajados();
  }

  async cargarDiasTrabajados() {
    try {
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
    } catch (error) {
      console.error('Error al cargar días trabajados:', error);
    }
  }

  getDiasDelMes(): Date[] {
    const primerDia = new Date(this.currentYear, this.currentMonth, 1);
    const ultimoDia = new Date(this.currentYear, this.currentMonth + 1, 0);
    const dias: Date[] = [];

    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push(new Date(this.currentYear, this.currentMonth, i));
    }

    return dias;
  }

  getDiaSemana(fecha: Date): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[fecha.getDay()];
  }

  isDiaTrabajado(fecha: Date, empleado: string): DiaTrabajo | null {
    if (!this.diasTrabajados[empleado]) return null;

    const fechaStr = fecha.toISOString().split('T')[0];
    return this.diasTrabajados[empleado].find(dia => dia.fecha === fechaStr) || null;
  }

  getClaseDia(fecha: Date, empleado: string): string {
    const diaTrabajo = this.isDiaTrabajado(fecha, empleado);
    if (!diaTrabajo) return '';

    let clase = 'dia-trabajado';
    if (diaTrabajo.pago) {
      clase += ' pago-realizado';
    }
    if (diaTrabajo.turno === 'Noche') {
      clase += ' turno-noche';
    }
    return clase;
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

  async agregarDia() {
    if (this.nuevoDia.fecha && this.nuevoDia.empleado && this.nuevoDia.turno) {
      try {
        await this.ngZone.runOutsideAngular(async () => {
          await addDoc(collection(this.firestore, 'empleados'), this.nuevoDia);
        });

        // Recargar datos
        await this.cargarDiasTrabajados();

        // Limpiar formulario
        this.nuevoDia = {
          fecha: '',
          empleado: '',
          turno: '',
          pago: false
        };

        this.registroGuardado.emit();
        alert('Día de trabajo agregado exitosamente');
      } catch (error) {
        alert('Error al agregar el día de trabajo');
      }
    }
  }

  getNombreMes(): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[this.currentMonth];
  }

  getTooltipDia(fecha: Date, empleado: string): string {
    const diaTrabajo = this.isDiaTrabajado(fecha, empleado);
    if (!diaTrabajo) {
      return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()} - No trabajó`;
    }

    let tooltip = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
    tooltip += ` - Turno: ${diaTrabajo.turno}`;
    if (diaTrabajo.pago) {
      tooltip += ' - Pago realizado';
    } else {
      tooltip += ' - Pago pendiente';
    }

    return tooltip;
  }
}
