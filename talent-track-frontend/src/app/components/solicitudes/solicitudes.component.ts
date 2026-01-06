import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './solicitudes.component.html'
})
export class SolicitudesComponent implements OnInit {
  
  // Listas de Datos
  misSolicitudes: any[] = [];
  solicitudesEquipo: any[] = []; // Bandeja de entrada del Jefe
  tiposAusencia: any[] = [];
  
  // Estado de la Interfaz
  activeTab: 'MIS_SOLICITUDES' | 'EQUIPO' = 'MIS_SOLICITUDES';
  showModal = false;
  loading = false;
  
  // Formulario
  solicitudForm: FormGroup;

  constructor(
    private api: ApiService,
    public auth: AuthService, // Public para usar en el HTML
    private fb: FormBuilder
  ) {
    // Definimos el formulario con validaciones
    this.solicitudForm = this.fb.group({
      tipo_ausencia: [null, Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      motivo: [''] // Opcional
    });
  }

  ngOnInit() {
    this.cargarDatos();
    
    // Si es Jefe o RRHH, cargamos también la bandeja de entrada
    if (this.auth.isManagement()) {
      this.cargarSolicitudesEquipo();
    }
  }

  // --- 1. CARGA DE DATOS ---
  cargarDatos() {
    this.loading = true;
    
    // A. Mis Solicitudes (Historial)
    this.api.getSolicitudes().subscribe({
      next: (res: any) => {
        // Soporte para paginación de Django (si devuelve .results) o array directo
        this.misSolicitudes = res.results || res;
        this.loading = false;
      },
      error: (e) => {
        console.error("Error cargando solicitudes", e);
        this.loading = false;
      }
    });

    // B. Catálogo de Tipos (Vacaciones, Permiso, etc)
    this.api.getTiposAusencia().subscribe((res: any) => {
      this.tiposAusencia = res.results || res;
    });
  }

  cargarSolicitudesEquipo() {
    // Nota: Reutilizamos el endpoint. El Backend ya filtra qué puedo ver.
    // Aquí en el frontend filtramos visualmente solo las "PENDIENTE" para la bandeja de entrada.
    this.api.getSolicitudes().subscribe((res: any) => {
      const todas = res.results || res;
      
      // Filtramos: Estado PENDIENTE y que NO sea mía (para no aprobarme a mí mismo)
      const miIdUsuario = this.auth.getUser()?.id; // ID del user logueado (referencial)
      
      this.solicitudesEquipo = todas.filter((s: any) => {
         // Lógica visual: Mostrar solo pendientes.
         // El backend ya impide aprobar las propias, pero visualmente ayuda ocultarlas aquí.
         return s.estado === 'PENDIENTE';
      });
    });
  }

  // --- 2. CREAR NUEVA SOLICITUD ---
  nuevaSolicitud() {
    // Validación Visual
    if (this.solicitudForm.invalid) {
      alert('⚠️ Por favor completa el Tipo de Ausencia y las Fechas.');
      this.solicitudForm.markAllAsTouched(); // Marca los campos en rojo
      return;
    }
    
    // Enviar al Backend
    this.api.createSolicitud(this.solicitudForm.value).subscribe({
      next: () => {
        alert('✅ Solicitud enviada correctamente.');
        this.showModal = false;
        this.solicitudForm.reset(); // Limpiar form
        this.cargarDatos(); // Recargar lista
      },
      error: (e) => {
        console.error(e);
        // Mensaje de error amigable (ej: "Saldo insuficiente")
        const errorMsg = e.error?.error || 'Ocurrió un error al enviar la solicitud.';
        alert('⛔ ' + errorMsg);
      }
    });
  }

  // --- 3. GESTIONAR (APROBAR/RECHAZAR) ---
  gestionar(id: number, estado: 'APROBADA' | 'RECHAZADA') {
    // Prompt seguro: Si cancela devuelve null, lo convertimos a string vacío
    const comentario = prompt("¿Deseas agregar un comentario para el colaborador?") || ''; 
    
    this.api.gestionarSolicitud(id, { 
      estado: estado, 
      comentario_jefe: comentario 
    }).subscribe({
      next: () => {
        alert(`Solicitud ${estado} con éxito.`);
        // Recargamos ambas listas para actualizar estados y contadores
        this.cargarDatos(); 
        this.cargarSolicitudesEquipo();
      },
      error: (e) => {
        console.error(e);
        const errorMsg = e.error?.error || 'Error al procesar la solicitud.';
        alert('⛔ ' + errorMsg);
      }
    });
  }
}