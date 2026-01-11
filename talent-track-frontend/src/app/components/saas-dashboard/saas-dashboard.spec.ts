import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaasDashboard } from './saas-dashboard';

describe('SaasDashboard', () => {
  let component: SaasDashboard;
  let fixture: ComponentFixture<SaasDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaasDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaasDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
