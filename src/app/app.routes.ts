import { Routes } from '@angular/router';
import { HomeComponent } from './modules/components/home/home.component';
import { RegistroPerrosPageComponent } from './modules/components/pages/registro-perros-page/registro-perros-page.component';
import { ContabilidadPageComponent } from './modules/components/pages/contabilidad-page/contabilidad-page.component';
import { EmpleadosPageComponent } from './modules/components/pages/empleados-page/empleados-page.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'registro-perros', component: RegistroPerrosPageComponent },
  { path: 'contabilidad', component: ContabilidadPageComponent },
  { path: 'empleados', component: EmpleadosPageComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
