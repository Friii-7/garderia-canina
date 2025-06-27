import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpleadosTablaComponent } from './empleados-tabla.component';

describe('EmpleadosTablaComponent', () => {
  let component: EmpleadosTablaComponent;
  let fixture: ComponentFixture<EmpleadosTablaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpleadosTablaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpleadosTablaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
