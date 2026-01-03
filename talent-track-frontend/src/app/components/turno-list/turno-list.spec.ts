import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Importante para que no falle ApiService
import { RouterTestingModule } from '@angular/router/testing'; // Importante para RouterLink

// Corregimos el nombre: De TurnoList a TurnoListComponent
import { TurnoListComponent } from './turno-list.component';

describe('TurnoListComponent', () => {
  let component: TurnoListComponent;
  let fixture: ComponentFixture<TurnoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Importamos el componente (porque es standalone)
      imports: [ 
        TurnoListComponent, 
        HttpClientTestingModule, // Simulamos las peticiones HTTP
        RouterTestingModule      // Simulamos las rutas
      ] 
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});