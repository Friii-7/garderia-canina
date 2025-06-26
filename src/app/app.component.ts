import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TablaRegistrosComponent } from "./modules/components/tabla-registros/tabla-registros.component";
import { RegistroFormularioComponent, RegistroPerro } from "./modules/components/registro-formulario/registro-formulario.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TablaRegistrosComponent, RegistroFormularioComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'guarderia_canina_estadio';

  @ViewChild(TablaRegistrosComponent) tablaComponent!: TablaRegistrosComponent;

  async onNuevoRegistro(registro: RegistroPerro) {
    // Actualizar la tabla después de guardar en Firebase
    if (this.tablaComponent) {
      await this.tablaComponent.actualizarTabla();
    }
  }
}



