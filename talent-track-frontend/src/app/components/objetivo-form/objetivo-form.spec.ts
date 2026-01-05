import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjetivoFormComponent } from './objetivo-form.component';

describe('ObjetivoFormComponent', () => {
  let component: ObjetivoFormComponent;
  let fixture: ComponentFixture<ObjetivoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjetivoFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObjetivoFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
