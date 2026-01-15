import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

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
  
  // --- GESTIÓN DE TIPOS (NUEVO) ---
  showModalTipos = false;
  nuevoTipo = { nombre: '', afecta_sueldo: false };
  procesandoTipo = false;

  // Permisos
  isJefeOrRRHH = false;
  usuarioActualId: number | null = null;

  // Estados de Carga
  loadingInit = true;
  loadingAction = false;
  
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
    
    // Validamos si tiene poder de gestión
    this.isJefeOrRRHH = this.auth.isManagement() || this.auth.isSuperAdmin();
    
    this.cargarDatosCompletos();
  }

  // --- 1. CARGA DE DATOS ---
  cargarDatosCompletos() {
    this.loadingInit = true; 
    
    forkJoin({
        tipos: this.api.getTiposAusencia(),
        solicitudes: this.api.getSolicitudes()
    })
    .pipe(finalize(() => {
        this.loadingInit = false;
        this.cdr.detectChanges();
    }))
    .subscribe({
        next: (res: any) => {
            this.tiposAusencia = Array.isArray(res.tipos) ? res.tipos : res.tipos.results;
            const todas = Array.isArray(res.solicitudes) ? res.solicitudes : res.solicitudes.results;
            
            // FILTRO 1: MIS SOLICITUDES (Soy el empleado)
            // Filtramos por el ID del empleado que viene en la solicitud
            this.misSolicitudes = todas.filter((s: any) => s.empleado.id === this.usuarioActualId || s.empleado === this.usuarioActualId);

            // FILTRO 2: BANDEJA DE ENTRADA (Soy el jefe)
            // El backend YA filtró lo que puedo ver según la lógica de sucursales que hicimos
            if (this.isJefeOrRRHH) {
                this.pendientesDeAprobar = todas.filter((s: any) => {
                    const idEmpleadoSolicitud = s.empleado.id || s.empleado;
                    return idEmpleadoSolicitud !== this.usuarioActualId && s.estado === 'PENDIENTE';
                });

                // Si tengo pendientes, muéstrame esa pestaña
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
      .pipe(finalize(() => { this.loadingAction = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          Swal.fire('Enviado', 'Solicitud creada correctamente.', 'success');
          this.showModal = false;
          this.formSolicitud.reset();
          this.cargarDatosCompletos();
        },
        error: (e) => {
          // Capturar el mensaje exacto del backend
          const msg = e.error?.error || 'Error desconocido';
          Swal.fire('Atención', msg, 'warning'); // Usamos warning para validaciones de negocio
        }
      });
  }

  // --- 3. GESTIONAR (APROBAR/RECHAZAR) ---
  gestionar(solicitud: any, estado: 'APROBADA' | 'RECHAZADA') {
    const accion = estado === 'APROBADA' ? 'aprobar' : 'rechazar';
    
    if (estado === 'APROBADA') {
        Swal.fire({
            title: '¿Aprobar Solicitud?',
            text: "Se descontarán los días del saldo si corresponde.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Aprobar'
        }).then((result) => {
            if (result.isConfirmed) this.enviarGestion(solicitud, estado);
        });
    } else {
        // Si rechaza, pedir motivo
        Swal.fire({
            title: 'Rechazar Solicitud',
            input: 'textarea',
            inputLabel: 'Motivo del rechazo',
            inputPlaceholder: 'Escribe la razón aquí...',
            inputAttributes: { 'aria-label': 'Motivo del rechazo' },
            showCancelButton: true
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.enviarGestion(solicitud, estado, result.value);
            }
        });
    }
  }

  enviarGestion(solicitud: any, estado: string, motivo: string = '') {
    this.loadingAction = true;
    this.api.gestionarSolicitud(solicitud.id, estado, motivo)
      .pipe(finalize(() => {
          this.loadingAction = false;
          this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
            Swal.fire('Procesado', res.status || 'Acción completada', 'success');
            this.cargarDatosCompletos();
        },
        error: (e) => Swal.fire('Error', e.error?.error || 'Error al procesar', 'error')
      });
  }

  // --- 4. GESTIÓN DE TIPOS DE AUSENCIA (LO NUEVO) ---
  guardarTipo() {
    if (!this.nuevoTipo.nombre.trim()) return;
    
    this.procesandoTipo = true;
    
    this.api.createTipoAusencia(this.nuevoTipo)
      .pipe(finalize(() => { 
          this.procesandoTipo = false; 
          this.cdr.detectChanges(); 
      }))
      .subscribe({
        next: () => {
            Swal.fire('Creado', 'Nuevo tipo de ausencia añadido.', 'success');
            this.nuevoTipo = { nombre: '', afecta_sueldo: false };
            this.cargarDatosCompletos(); // Recargar la lista para que aparezca
        },
        error: (e) => Swal.fire('Error', e.error?.error || 'No se pudo crear.', 'error')
      });
  }

  eliminarTipo(id: number) {
    Swal.fire({
        title: '¿Eliminar Tipo?',
        text: "No podrás eliminarlo si ya hay solicitudes usándolo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
        if(result.isConfirmed) {
            this.api.deleteTipoAusencia(id).subscribe({
              next: () => {
                  Swal.fire('Eliminado', 'Tipo eliminado.', 'success');
                  this.cargarDatosCompletos();
              },
              error: () => Swal.fire('Error', 'No se puede eliminar porque está en uso.', 'error')
            });
        }
    });
  }
}