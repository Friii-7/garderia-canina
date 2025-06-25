import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RegistroPerro {
  nombre: string;
  fecha: string;
  tamano: string;
  dias: number;
  diSol: boolean;
  bano: boolean;
  ingresos: number;
  gastos: number;
  total: number;
}

@Component({
  selector: 'app-registro-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-formulario.component.html',
  styleUrl: './registro-formulario.component.scss'
})
export class RegistroFormularioComponent {
  @Output() nuevoRegistro = new EventEmitter<RegistroPerro>();

  // Datos del formulario
  nombreMascota: string = '';
  fechaIngreso: string = '';
  tamanoPerro: string = '';
  diasAlojamiento: number = 0;
  servicioDiSol: boolean = false;
  servicioBano: boolean = false;
  gastos: number = 0;

  // Valores calculados
  ingresos: number = 0;
  total: number = 0;

  // Tarifas
  readonly tarifaDiSol = 25000;
  readonly tarifaBano = 50000;

  // Opciones de tamaño
  opcionesTamano = [
    { valor: '35000', texto: 'Pequeño (35 000 COP/día)' },
    { valor: '40000', texto: 'Mediano (40 000 COP/día)' },
    { valor: '45000', texto: 'Grande (45 000 COP/día)' }
  ];

  actualizarIngresos() {
    const rateDia = parseFloat(this.tamanoPerro) || 0;
    const dias = this.diasAlojamiento || 0;
    const costoAloja = rateDia * dias;
    const costoDiSol = this.servicioDiSol ? this.tarifaDiSol : 0;
    const costoBano = this.servicioBano ? this.tarifaBano : 0;
    this.ingresos = costoAloja + costoDiSol + costoBano;
    this.calcularTotal();
  }

  calcularTotal() {
    this.total = this.ingresos + (this.gastos || 0);
  }

  onSubmit() {
    if (!this.nombreMascota || !this.fechaIngreso || !this.tamanoPerro) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const tamanoTexto = this.opcionesTamano.find(op => op.valor === this.tamanoPerro)?.texto || '';

    const registro: RegistroPerro = {
      nombre: this.nombreMascota,
      fecha: this.fechaIngreso,
      tamano: tamanoTexto,
      dias: this.diasAlojamiento,
      diSol: this.servicioDiSol,
      bano: this.servicioBano,
      ingresos: this.ingresos,
      gastos: this.gastos,
      total: this.total
    };

    this.nuevoRegistro.emit(registro);
    this.resetForm();
  }

  resetForm() {
    this.nombreMascota = '';
    this.fechaIngreso = '';
    this.tamanoPerro = '';
    this.diasAlojamiento = 0;
    this.servicioDiSol = false;
    this.servicioBano = false;
    this.gastos = 0;
    this.ingresos = 0;
    this.total = 0;
  }
}
