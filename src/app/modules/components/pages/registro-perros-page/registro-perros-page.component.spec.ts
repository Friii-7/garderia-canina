import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroPerrosPageComponent } from './registro-perros-page.component';

describe('RegistroPerrosPageComponent', () => {
  let component: RegistroPerrosPageComponent;
  let fixture: ComponentFixture<RegistroPerrosPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroPerrosPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroPerrosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
