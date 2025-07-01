import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistroFormularioComponent } from './modules/components/registro-formulario/registro-formulario.component';
import { TablaRegistrosComponent } from './modules/components/tabla-registros/tabla-registros.component';
import { ContabilidadFormularioComponent } from './modules/components/contabilidad-formulario/contabilidad-formulario.component';
import { ContabilidadTablaComponent } from './modules/components/contabilidad-tabla/contabilidad-tabla.component';
import { EmpleadosFormularioComponent } from './modules/components/empleados-formulario/empleados-formulario.component';
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
}



