import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigAusencias } from './config-ausencias.component';

describe('ConfigAusencias', () => {
  let component: ConfigAusencias;
  let fixture: ComponentFixture<ConfigAusencias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigAusencias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigAusencias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
