import { Routes } from '@angular/router';
import { RegistroFormularioComponent } from './modules/components/registro-formulario/registro-formulario.component';


export const routes: Routes = [
  { path: 'formulario', component: RegistroFormularioComponent },
  { path: '', redirectTo: '/formulario', pathMatch: 'full' }
];
