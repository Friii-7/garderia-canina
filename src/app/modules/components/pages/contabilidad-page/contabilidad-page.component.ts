import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContabilidadFormularioComponent } from '../../contabilidad-formulario/contabilidad-formulario.component';
import { ContabilidadTablaComponent } from '../../contabilidad-tabla/contabilidad-tabla.component';

@Component({
  selector: 'app-contabilidad-page',
  standalone: true,
  imports: [
    CommonModule,
    ContabilidadFormularioComponent,
    ContabilidadTablaComponent
  ],
  templateUrl: './contabilidad-page.component.html',
  styleUrl: './contabilidad-page.component.scss'
})
export class ContabilidadPageComponent {
  @ViewChild('formSection') formSection!: ElementRef;

  scrollToForm() {
    this.formSection.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}
