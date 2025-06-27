import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContabilidadTablaComponent } from './contabilidad-tabla.component';

describe('ContabilidadTablaComponent', () => {
  let component: ContabilidadTablaComponent;
  let fixture: ComponentFixture<ContabilidadTablaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContabilidadTablaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContabilidadTablaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
