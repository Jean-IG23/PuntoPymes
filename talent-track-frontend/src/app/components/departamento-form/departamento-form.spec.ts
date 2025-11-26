import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartamentoForm } from './departamento-form';

describe('DepartamentoForm', () => {
  let component: DepartamentoForm;
  let fixture: ComponentFixture<DepartamentoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartamentoForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartamentoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
