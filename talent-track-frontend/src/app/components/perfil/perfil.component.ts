import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  
  perfilForm: FormGroup;
  passwordForm: FormGroup;
  
  empleado: any = null;
  loading = false;
  activeTab: 'informacion' | 'desempeño' | 'solicitudes' = 'informacion';
  
  // Manejo de Imágenes
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  // Datos adicionales
  objetivos: any[] = [];
  solicitudes: any[] = [];
  kpis: any[] = [];

  constructor(
    private fb: FormBuilder, 
    private api: ApiService, 
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    // 1. Formulario de Datos Personales
    this.perfilForm = this.fb.group({
      telefono: [''],
      direccion: ['']
    });

    // 2. Formulario de Contraseña
    this.passwordForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.checkPasswords });
  }

  // Validador personalizado para coincidencia de claves
  checkPasswords(group: FormGroup) {
    const pass = group.get('new_password')?.value;
    const confirm = group.get('confirm_password')?.value;
    return pass === confirm ? null : { notSame: true };
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    
    // Cargar perfil + objetivos + solicitudes en paralelo
    forkJoin({
      perfil: this.api.getMiPerfil(),
      solicitudes: this.api.getSolicitudes(),
      kpis: this.api.getKPIs()
    }).subscribe({
      next: (res: any) => {
        this.empleado = res.perfil;
        this.solicitudes = res.solicitudes || [];
        this.kpis = res.kpis || [];
        
        // Si el empleado tiene ID, cargar sus objetivos
        if (this.empleado?.id) {
          this.api.getObjetivos(this.empleado.id).subscribe({
            next: (objs: any) => {
              this.objetivos = Array.isArray(objs) ? objs : objs.results || [];
              this.loading = false;
              this.cdr.detectChanges();
            },
            error: () => {
              this.objetivos = [];
              this.loading = false;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }

        // Llenar formulario con datos actuales
        this.perfilForm.patchValue({
          telefono: res.perfil.telefono,
          direccion: res.perfil.direccion
        });
        
        // Precargar foto
        if (res.perfil.foto) {
          this.imagePreview = res.perfil.foto.startsWith('http') 
            ? res.perfil.foto 
            : `http://localhost:8000${res.perfil.foto}`;
        }
        
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error("Error cargando datos:", e);
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar los datos del perfil', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // --- SUBIDA DE FOTO ---
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = e => {
        this.imagePreview = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  guardarPerfil() {
    if (this.perfilForm.invalid) return;

    const formData = new FormData();
    formData.append('telefono', this.perfilForm.get('telefono')?.value || '');
    formData.append('direccion', this.perfilForm.get('direccion')?.value || '');
    
    if (this.selectedFile) {
      formData.append('foto', this.selectedFile);
    }

    this.loading = true;
    this.api.updatePerfil(formData).subscribe({
      next: (res) => {
        Swal.fire('Actualizado', 'Tu perfil se ha guardado correctamente.', 'success');
        this.selectedFile = null;
        this.loading = false;
        this.cargarDatos();
      },
      error: (e) => {
        this.loading = false;
        Swal.fire('Error', 'No se pudo actualizar el perfil', 'error');
      }
    });
  }

  cambiarPassword() {
    if (this.passwordForm.invalid) return;

    this.loading = true;
    this.api.changePassword(this.passwordForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.passwordForm.reset();
        Swal.fire('Éxito', 'Contraseña actualizada. Usa la nueva la próxima vez.', 'success');
      },
      error: (e) => {
        this.loading = false;
        const msg = e.error?.old_password?.[0] || e.error?.new_password?.[0] || 'Error al cambiar contraseña';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  // Cambiar tab
  setActiveTab(tab: 'informacion' | 'desempeño' | 'solicitudes') {
    this.activeTab = tab;
  }

  // Helper para mostrar estado de solicitud
  getEstadoColor(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'aprobada': return 'green';
      case 'pendiente': return 'orange';
      case 'rechazada': return 'red';
      default: return 'gray';
    }
  }

  // Helper para formatear fecha
  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
}