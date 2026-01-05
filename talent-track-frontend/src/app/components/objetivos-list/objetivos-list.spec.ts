import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjetivosList } from './objetivos-list.component';

describe('ObjetivosList', () => {
  let component: ObjetivosList;
  let fixture: ComponentFixture<ObjetivosList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjetivosList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObjetivosList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
