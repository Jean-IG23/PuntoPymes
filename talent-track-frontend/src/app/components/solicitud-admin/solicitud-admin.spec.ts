import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudAdmin } from './solicitud-admin';

describe('SolicitudAdmin', () => {
  let component: SolicitudAdmin;
  let fixture: ComponentFixture<SolicitudAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitudAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
