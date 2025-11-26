import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpresaForm } from './empresa-form';

describe('EmpresaForm', () => {
  let component: EmpresaForm;
  let fixture: ComponentFixture<EmpresaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpresaForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpresaForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
