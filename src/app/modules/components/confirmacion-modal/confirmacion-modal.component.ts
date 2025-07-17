import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmacionModalData {
  titulo: string;
  mensaje: string;
  tipo: 'confirmar' | 'eliminar' | 'editar' | 'guardar';
  textoBotonConfirmar?: string;
  textoBotonCancelar?: string;
}

@Component({
  selector: 'app-confirmacion-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmacion-modal.component.html',
  styleUrls: ['./confirmacion-modal.component.scss']
})
export class ConfirmacionModalComponent {
  @Input() mostrar: boolean = false;
  @Input() datos: ConfirmacionModalData = {
    titulo: 'Confirmar',
    mensaje: '¿Estás seguro de que quieres continuar?',
    tipo: 'confirmar'
  };

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  get textoBotonConfirmar(): string {
    return this.datos.textoBotonConfirmar || this.getTextoBotonPorTipo();
  }

  get textoBotonCancelar(): string {
    return this.datos.textoBotonCancelar || 'Cancelar';
  }

  get claseBotonConfirmar(): string {
    switch (this.datos.tipo) {
      case 'eliminar':
        return 'btn-danger';
      case 'editar':
        return 'btn-warning';
      case 'guardar':
        return 'btn-success';
      default:
        return 'btn-primary';
    }
  }

  private getTextoBotonPorTipo(): string {
    switch (this.datos.tipo) {
      case 'eliminar':
        return 'Eliminar';
      case 'editar':
        return 'Editar';
      case 'guardar':
        return 'Guardar';
      default:
        return 'Confirmar';
    }
  }

  onConfirmar(): void {
    this.confirmar.emit();
  }

  onCancelar(): void {
    this.cancelar.emit();
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCerrar();
    }
  }
}
