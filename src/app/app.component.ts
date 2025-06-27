import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistroFormularioComponent } from './modules/components/registro-formulario/registro-formulario.component';
import { TablaRegistrosComponent } from './modules/components/tabla-registros/tabla-registros.component';
import { ContabilidadFormularioComponent, ContabilidadRegistro } from './modules/components/contabilidad-formulario/contabilidad-formulario.component';
import { ContabilidadTablaComponent } from './modules/components/contabilidad-tabla/contabilidad-tabla.component';
import { EmpleadosFormularioComponent, EmpleadoRegistro } from './modules/components/empleados-formulario/empleados-formulario.component';
import { EmpleadosTablaComponent } from './modules/components/empleados-tabla/empleados-tabla.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RegistroFormularioComponent,
    TablaRegistrosComponent,
    ContabilidadFormularioComponent,
    ContabilidadTablaComponent,
    EmpleadosFormularioComponent,
    EmpleadosTablaComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'garderia-canina';

  // Registros de contabilidad
  registrosContabilidad: ContabilidadRegistro[] = [];

  // Registros de empleados
  registrosEmpleados: EmpleadoRegistro[] = [];

  onNuevoRegistroContabilidad(registro: ContabilidadRegistro) {
    this.registrosContabilidad.push(registro);
  }

  onNuevoRegistroEmpleado(registro: EmpleadoRegistro) {
    this.registrosEmpleados.push(registro);
  }

  // Métodos para contabilidad
  onEditarContabilidad(registro: ContabilidadRegistro) {
    // Aquí puedes implementar la lógica de edición
    console.log('Editar registro de contabilidad:', registro);
    // Por ahora solo mostraremos un alert
    alert('Funcionalidad de edición en desarrollo');
  }

  onEliminarContabilidad(id: string) {
    this.registrosContabilidad = this.registrosContabilidad.filter(r => r.id !== id);
  }

  // Métodos para empleados
  onEditarEmpleado(registro: EmpleadoRegistro) {
    // Aquí puedes implementar la lógica de edición
    console.log('Editar registro de empleado:', registro);
    // Por ahora solo mostraremos un alert
    alert('Funcionalidad de edición en desarrollo');
  }

  onEliminarEmpleado(id: string) {
    this.registrosEmpleados = this.registrosEmpleados.filter(r => r.id !== id);
  }
}



