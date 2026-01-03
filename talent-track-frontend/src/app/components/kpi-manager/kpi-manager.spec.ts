import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // <--- Importante para que no falle el servicio
import { KpiManagerComponent } from './kpi-manager.component'; // <--- Nombre corregido

describe('KpiManagerComponent', () => {
  let component: KpiManagerComponent;
  let fixture: ComponentFixture<KpiManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        KpiManagerComponent, // <--- Nombre corregido
        HttpClientTestingModule // <--- Necesario porque tu componente usa ApiService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KpiManagerComponent); // <--- Nombre corregido
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});