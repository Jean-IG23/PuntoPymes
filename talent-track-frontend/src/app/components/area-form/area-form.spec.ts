import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaFormComponent } from './area-form.component';

describe('AreaForm', () => {
  let component: AreaFormComponent;
  let fixture: ComponentFixture<AreaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AreaFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
