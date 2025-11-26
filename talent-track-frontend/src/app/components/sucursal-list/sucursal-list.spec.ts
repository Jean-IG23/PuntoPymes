import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SucursalList } from './sucursal-list';

describe('SucursalList', () => {
  let component: SucursalList;
  let fixture: ComponentFixture<SucursalList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SucursalList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SucursalList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
