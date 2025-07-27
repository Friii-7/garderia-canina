import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpleadosFormularioComponent } from '../../empleados-formulario/empleados-formulario.component';
import { EmpleadosTablaComponent } from '../../empleados-tabla/empleados-tabla.component';

@Component({
  selector: 'app-empleados-page',
  standalone: true,
  imports: [
    CommonModule,
    EmpleadosFormularioComponent,
    EmpleadosTablaComponent
  ],
  templateUrl: './empleados-page.component.html',
  styleUrl: './empleados-page.component.scss'
})
export class EmpleadosPageComponent {
  @ViewChild('formSection') formSection!: ElementRef;

  scrollToForm() {
    this.formSection.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}
