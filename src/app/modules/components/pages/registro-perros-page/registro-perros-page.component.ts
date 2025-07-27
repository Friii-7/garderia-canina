import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistroFormularioComponent } from '../../registro-formulario/registro-formulario.component';
import { TablaRegistrosComponent } from '../../tabla-registros/tabla-registros.component';

@Component({
  selector: 'app-registro-perros-page',
  standalone: true,
  imports: [
    CommonModule,
    RegistroFormularioComponent,
    TablaRegistrosComponent
  ],
  templateUrl: './registro-perros-page.component.html',
  styleUrl: './registro-perros-page.component.scss'
})
export class RegistroPerrosPageComponent {
  @ViewChild('formSection') formSection!: ElementRef;

  scrollToForm() {
    this.formSection.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}
