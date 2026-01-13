import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './solicitudes.component.html'
})
export class SolicitudesComponent implements OnInit {
  
  // Datos
  misSolicitudes: any[] = [];
  pendientesDeAprobar: any[] = [];
  tiposAusencia: any[] = [];
  
  // Estados de Vista
  activeTab: 'MIS_SOLICITUDES' | 'EQUIPO' = 'MIS_SOLICITUDES';
  showModal = false;
  showModalTipos = false;
  isJefeOrRRHH = false;
  usuarioActualId: number | null = null;
  nuevoTipo = { nombre: '', afecta_sueldo: false };

  // --- ESTADOS DE CARGA ---
  loadingInit = true;       // Carga inicial de la página
  loadingAction = false;    // Para botones generales
  procesandoTipo = false;   // <--- AQUÍ ESTÁ LA VARIABLE QUE FALTABA
  
  formSolicitud: FormGroup;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.formSolicitud = this.fb.group({
      tipo_ausencia: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit() {
    const user = this.auth.getUser();
    this.usuarioActualId = user ? user.id : null;
    this.isJefeOrRRHH = this.auth.isManagement() || this.auth.isSuperAdmin();
    this.cargarDatosCompletos();
  }

  // --- 1. CARGA DE DATOS ---
  cargarDatosCompletos() {
    if (this.misSolicitudes.length === 0) {
        this.loadingInit = true; 
    }
    
    forkJoin({
        tipos: this.api.getTiposAusencia(),
        solicitudes: this.api.getSolicitudes()
    })
    .pipe(
        finalize(() => {
            this.loadingInit = false;
            this.cdr.detectChanges();
        })
    )
    .subscribe({
        next: (res: any) => {
            this.tiposAusencia = res.tipos.results || res.tipos;
            const todas = res.solicitudes.results || res.solicitudes;
            
            // FILTRO 1: MIS SOLICITUDES
            // Usamos el nuevo campo 'usuario_id' que viene del backend
            this.misSolicitudes = todas.filter((s: any) => {
                return s.usuario_id == this.usuarioActualId;
            });

            // FILTRO 2: BANDEJA DE ENTRADA (EQUIPO)
            if (this.isJefeOrRRHH) {
                this.pendientesDeAprobar = todas.filter((s: any) => {
                    // Es pendiente Y NO es mía
                    return s.usuario_id != this.usuarioActualId && s.estado === 'PENDIENTE';
                });

                // 🔥 LOGICA AUTOMÁTICA DE PESTAÑAS 🔥
                // Si tengo pendientes que aprobar, muéstrame esa pestaña primero
                if (this.pendientesDeAprobar.length > 0) {
                    this.activeTab = 'EQUIPO';
                }
            }
        },
        error: (e) => console.error('Error cargando datos:', e)
    });
  }

  // --- 2. CREAR SOLICITUD ---
  crearSolicitud() {
    if (this.formSolicitud.invalid) return;
    
    this.loadingAction = true; 
    
    this.api.createSolicitud(this.formSolicitud.value)
      .pipe(finalize(() => {
          this.loadingAction = false;
          this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          alert('✅ Solicitud enviada correctamente.');
          this.showModal = false;
          this.formSolicitud.reset();
          this.cargarDatosCompletos();
        },
        error: (e) => {
          let msg = 'Error desconocido';
          if (e.error) {
              if (e.error.non_field_errors) msg = e.error.non_field_errors[0];
              else if (e.error.detail) msg = e.error.detail;
              else msg = JSON.stringify(e.error);
          }
          alert('⛔ Error: ' + msg);
        }
      });
  }

  // --- 3. GESTIONAR ---
  gestionar(solicitud: any, estado: 'APROBADA' | 'RECHAZADA') {
    const accion = estado === 'APROBADA' ? 'aprobar' : 'rechazar';
    let comentario = '';

    if (estado === 'RECHAZADA') {
        comentario = prompt('Motivo del rechazo:') || '';
        if (!comentario) return; 
    }

    if (!confirm(`¿Estás seguro de ${accion} esta solicitud?`)) return;

    this.loadingAction = true;

    this.api.gestionarSolicitud(solicitud.id, estado, comentario)
      .pipe(finalize(() => {
          this.loadingAction = false;
          this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
            this.cargarDatosCompletos();
        },
        error: (e) => alert('Error: ' + (e.error?.error || e.message))
      });
  }

  // --- 4. GESTIÓN DE TIPOS (Aquí usamos procesandoTipo) ---
  guardarTipo() {
    if (!this.nuevoTipo.nombre.trim()) return;
    
    this.procesandoTipo = true; // Usamos la variable específica
    
    this.api.createTipoAusencia(this.nuevoTipo)
      .pipe(finalize(() => { 
          this.procesandoTipo = false; 
          this.cdr.detectChanges(); 
      }))
      .subscribe({
        next: () => {
            alert('✅ Tipo creado.');
            this.nuevoTipo = { nombre: '', afecta_sueldo: false };
            this.cargarDatosCompletos();
        },
        error: (e) => alert('⛔ Error: ' + (e.error?.error || e.message))
      });
  }

  eliminarTipo(id: number) {
    if(!confirm('¿Eliminar este tipo?')) return;
    this.api.deleteTipoAusencia(id).subscribe({
      next: () => this.cargarDatosCompletos(),
      error: () => alert('No se puede eliminar.')
    });
  }
}