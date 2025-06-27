import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContabilidadFormularioComponent } from './contabilidad-formulario.component';

describe('ContabilidadFormularioComponent', () => {
  let component: ContabilidadFormularioComponent;
  let fixture: ComponentFixture<ContabilidadFormularioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContabilidadFormularioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContabilidadFormularioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
