import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpleadoList } from './empleado-list';

describe('EmpleadoList', () => {
  let component: EmpleadoList;
  let fixture: ComponentFixture<EmpleadoList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpleadoList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpleadoList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
