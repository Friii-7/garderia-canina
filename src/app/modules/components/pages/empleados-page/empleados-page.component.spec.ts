import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpleadosPageComponent } from './empleados-page.component';

describe('EmpleadosPageComponent', () => {
  let component: EmpleadosPageComponent;
  let fixture: ComponentFixture<EmpleadosPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpleadosPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpleadosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
