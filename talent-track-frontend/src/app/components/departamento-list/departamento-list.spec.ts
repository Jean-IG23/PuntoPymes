import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartamentoList } from './departamento-list';

describe('DepartamentoList', () => {
  let component: DepartamentoList;
  let fixture: ComponentFixture<DepartamentoList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartamentoList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartamentoList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
