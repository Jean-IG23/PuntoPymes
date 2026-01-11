import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-saas-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './saas-dashboard.component.html'
})
export class SaasDashboardComponent implements OnInit {

  empresas: any[] = [];
  formEmpresa: FormGroup;
  loading = false;
  esParaCliente: boolean = false; 

  constructor(
    private api: ApiService, 
    private fb: FormBuilder,
    public auth: AuthService,
    private router: Router
  ) {
    this.formEmpresa = this.fb.group({
      nombre: ['', Validators.required],
      direccion: [''],
      telefono: [''],
      // Campos opcionales para crear usuario nuevo
      admin_nombre: [''],
      admin_email: [''],
      admin_password: ['']
    });
  }

  ngOnInit() {
    if (!this.auth.isSuperAdmin()) {
      this.router.navigate(['/dashboard']);
    }
    this.cargarEmpresas();
  }

  // Switch para activar validaciones de usuario nuevo
  toggleModoCliente() {
    this.esParaCliente = !this.esParaCliente;
    
    const emailControl = this.formEmpresa.get('admin_email');
    const passControl = this.formEmpresa.get('admin_password');
    const nombreControl = this.formEmpresa.get('admin_nombre');

    if (this.esParaCliente) {
      emailControl?.setValidators([Validators.required, Validators.email]);
      passControl?.setValidators([Validators.required, Validators.minLength(6)]);
      nombreControl?.setValidators([Validators.required]);
    } else {
      emailControl?.clearValidators();
      passControl?.clearValidators();
      nombreControl?.clearValidators();
      // Limpiar valores
      emailControl?.setValue('');
      passControl?.setValue('');
      nombreControl?.setValue('');
    }
    
    emailControl?.updateValueAndValidity();
    passControl?.updateValueAndValidity();
    nombreControl?.updateValueAndValidity();
  }

  cargarEmpresas() {
    this.loading = true;
    this.api.getEmpresas().subscribe((res: any) => {
      this.empresas = res.results || res;
      this.loading = false;
    });
  }

  crearEmpresa() {
    if (this.formEmpresa.invalid) return;

    this.api.createEmpresa(this.formEmpresa.value).subscribe({
      next: (res) => {
        alert(`Empresa "${res.nombre}" creada.`);
        this.formEmpresa.reset();
        
        // Reset manual del switch
        this.esParaCliente = false; 
        this.toggleModoCliente(); // Vuelve a ejecutar para limpiar validadores
        this.esParaCliente = false; // Asegurar estado

        this.cargarEmpresas();
        
        // Si me vinculé a mí mismo (no era cliente), recargo para ver cambios
        if (!this.esParaCliente && confirm('Empresa vinculada. ¿Ir al Dashboard normal?')) {
            window.location.href = '/dashboard';
        }
      },
      error: (e) => {
        const msg = e.error?.error || e.message || 'Error desconocido';
        alert('❌ Error: ' + msg);
      }
    });
  }
}