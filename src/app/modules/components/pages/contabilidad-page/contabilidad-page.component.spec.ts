import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContabilidadPageComponent } from './contabilidad-page.component';

describe('ContabilidadPageComponent', () => {
  let component: ContabilidadPageComponent;
  let fixture: ComponentFixture<ContabilidadPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContabilidadPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContabilidadPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
