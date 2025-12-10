import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnoFormComponent } from './turno-form.component';

describe('TurnoForm', () => {
  let component: TurnoFormComponent;
  let fixture: ComponentFixture<TurnoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnoFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnoFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
