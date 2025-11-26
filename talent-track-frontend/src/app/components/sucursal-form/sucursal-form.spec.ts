import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SucursalForm } from './sucursal-form';

describe('SucursalForm', () => {
  let component: SucursalForm;
  let fixture: ComponentFixture<SucursalForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SucursalForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SucursalForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
