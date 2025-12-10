import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PuestoList } from './puesto-list';

describe('PuestoList', () => {
  let component: PuestoList;
  let fixture: ComponentFixture<PuestoList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PuestoList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PuestoList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
