import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PuestoForm } from './puesto-form';

describe('PuestoForm', () => {
  let component: PuestoForm;
  let fixture: ComponentFixture<PuestoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PuestoForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PuestoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
