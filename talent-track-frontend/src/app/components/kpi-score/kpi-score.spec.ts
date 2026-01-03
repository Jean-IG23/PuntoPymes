import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KpiScore } from './kpi-score';

describe('KpiScore', () => {
  let component: KpiScore;
  let fixture: ComponentFixture<KpiScore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiScore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KpiScore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
