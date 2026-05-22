package com.example.springboot;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "usuarios")
class Usuario {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotBlank
  @Size(max = 50)
  public String username;

  @NotBlank
  @Email
  @Size(max = 100)
  public String email;

  @NotBlank
  @Size(max = 255)
  public String password;

  @NotBlank
  @Size(max = 100)
  public String nombre;

  @NotBlank
  @Size(max = 100)
  public String apellido;

  @Size(max = 15)
  public String telefono;

  @Column(columnDefinition = "TEXT")
  public String direccion;

  @Size(max = 50)
  public String ciudad;

  @Column(name = "codigo_postal")
  @Size(max = 10)
  public String codigoPostal;

  @Size(max = 50)
  public String pais;

  @Column(name = "documento_identidad")
  @Size(max = 20)
  public String documentoIdentidad;

  @Column(name = "tipo_usuario")
  @Size(max = 20)
  public String tipoUsuario = "cliente";

  @Size(max = 20)
  public String estado = "activo";

  @Column(name = "foto_perfil")
  @Size(max = 255)
  public String fotoPerfil;

  @Column(name = "fecha_registro", insertable = false, updatable = false)
  public LocalDateTime fechaRegistro;

  @Column(name = "ultima_actualizacion", insertable = false, updatable = false)
  public LocalDateTime ultimaActualizacion;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "categorias_servicios")
class CategoriaServicio {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotBlank
  @Size(max = 100)
  public String nombre;

  @Column(columnDefinition = "TEXT")
  public String descripcion;

  @Size(max = 255)
  public String icono;

  @Size(max = 20)
  public String estado = "activo";

  @Column(name = "fecha_creacion", insertable = false, updatable = false)
  public LocalDateTime fechaCreacion;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "servicios")
class Servicio {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "categoria_id")
  public CategoriaServicio categoria;

  @NotBlank
  @Size(max = 150)
  public String nombre;

  @Column(columnDefinition = "TEXT")
  public String descripcion;

  @NotNull
  @DecimalMin("0.00")
  @Column(name = "precio_base")
  public BigDecimal precioBase;

  @Column(name = "tiempo_estimado")
  public Integer tiempoEstimado;

  @Size(max = 30)
  public String disponibilidad = "disponible";

  @Size(max = 255)
  public String imagen;

  @Column(name = "puntuacion_promedio", insertable = false)
  public BigDecimal puntuacionPromedio;

  @Column(name = "total_resenas", insertable = false)
  public Integer totalResenas;

  @ManyToOne
  @JoinColumn(name = "crear_por")
  public Usuario crearPor;

  @Column(name = "fecha_creacion", insertable = false, updatable = false)
  public LocalDateTime fechaCreacion;

  @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
  public LocalDateTime fechaActualizacion;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "solicitudes")
class Solicitud {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "usuario_id")
  public Usuario usuario;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "servicio_id")
  public Servicio servicio;

  @ManyToOne
  @JoinColumn(name = "tecnico_id")
  public Usuario tecnico;

  @Column(name = "numero_solicitud")
  @Size(max = 20)
  public String numeroSolicitud;

  @Column(name = "fecha_solicitud", insertable = false, updatable = false)
  public LocalDateTime fechaSolicitud;

  @NotNull
  @Column(name = "fecha_programada")
  public LocalDateTime fechaProgramada;

  @Column(name = "fecha_completacion")
  public LocalDateTime fechaCompletacion;

  @Size(max = 30)
  public String estado = "pendiente";

  @Size(max = 20)
  public String prioridad = "media";

  @Column(name = "descripcion_problema", columnDefinition = "TEXT")
  public String descripcionProblema;

  @Column(name = "notas_internas", columnDefinition = "TEXT")
  public String notasInternas;

  @Min(1)
  @Max(5)
  @Column(name = "calificacion_usuario")
  public Integer calificacionUsuario;

  @Column(name = "resena_usuario", columnDefinition = "TEXT")
  public String resenaUsuario;

  @Column(name = "costo_final")
  public BigDecimal costoFinal;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "pagos")
class Pago {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "solicitud_id")
  public Solicitud solicitud;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "usuario_id")
  public Usuario usuario;

  @NotNull
  @DecimalMin("0.00")
  public BigDecimal monto;

  @NotBlank
  @Column(name = "metodo_pago")
  @Size(max = 30)
  public String metodoPago;

  @Column(name = "numero_transaccion")
  @Size(max = 50)
  public String numeroTransaccion;

  @Column(name = "estado_pago")
  @Size(max = 30)
  public String estadoPago = "pendiente";

  @Column(name = "fecha_pago", insertable = false, updatable = false)
  public LocalDateTime fechaPago;

  @Column(name = "fecha_vencimiento")
  public LocalDateTime fechaVencimiento;

  @Column(name = "comprobante_url")
  @Size(max = 255)
  public String comprobanteUrl;

  @Column(columnDefinition = "TEXT")
  public String comentarios;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "notificaciones")
class Notificacion {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "usuario_id")
  public Usuario usuario;

  @NotBlank
  @Size(max = 150)
  public String titulo;

  @NotBlank
  @Column(columnDefinition = "TEXT")
  public String mensaje;

  @Size(max = 30)
  public String tipo = "info";

  @Column(name = "relacionado_a")
  @Size(max = 50)
  public String relacionadoA;

  @Column(name = "relacionado_id")
  public Integer relacionadoId;

  public Boolean leida = false;

  @Column(name = "fecha_creacion", insertable = false, updatable = false)
  public LocalDateTime fechaCreacion;

  @Column(name = "fecha_lectura")
  public LocalDateTime fechaLectura;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "resenas_servicios")
class ResenaServicio {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "servicio_id")
  public Servicio servicio;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "usuario_id")
  public Usuario usuario;

  @ManyToOne
  @JoinColumn(name = "solicitud_id")
  public Solicitud solicitud;

  @NotNull
  @Min(1)
  @Max(5)
  public Integer calificacion;

  @Size(max = 150)
  public String titulo;

  @Column(columnDefinition = "TEXT")
  public String comentario;

  @Column(name = "fecha_resena", insertable = false, updatable = false)
  public LocalDateTime fechaResena;

  public Integer util = 0;

  @Size(max = 20)
  public String estado = "pendiente";
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "disponibilidad_tecnicos")
class DisponibilidadTecnico {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "tecnico_id")
  public Usuario tecnico;

  @NotBlank
  @Column(name = "dia_semana")
  @Size(max = 20)
  public String diaSemana;

  @NotNull
  @Column(name = "hora_inicio")
  public LocalTime horaInicio;

  @NotNull
  @Column(name = "hora_fin")
  public LocalTime horaFin;

  @Column(name = "numero_slots")
  public Integer numeroSlots = 10;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "reportes_sistema")
class ReporteSistema {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "usuario_id")
  public Usuario usuario;

  @NotBlank
  @Column(name = "tipo_reporte")
  @Size(max = 40)
  public String tipoReporte;

  @Column(name = "fecha_desde")
  public LocalDate fechaDesde;

  @Column(name = "fecha_hasta")
  public LocalDate fechaHasta;

  @Size(max = 20)
  public String formato = "pantalla";

  @Column(name = "url_descarga")
  @Size(max = 255)
  public String urlDescarga;

  @Column(name = "fecha_generacion", insertable = false, updatable = false)
  public LocalDateTime fechaGeneracion;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "historial_cambios")
class HistorialCambio {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "solicitud_id")
  public Solicitud solicitud;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "usuario_id")
  public Usuario usuario;

  @Column(name = "campo_modificado")
  @Size(max = 100)
  public String campoModificado;

  @Column(name = "valor_anterior")
  @Size(max = 255)
  public String valorAnterior;

  @Column(name = "valor_nuevo")
  @Size(max = 255)
  public String valorNuevo;

  @Column(name = "fecha_cambio", insertable = false, updatable = false)
  public LocalDateTime fechaCambio;
}

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "tickets_soporte")
class TicketSoporte {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Integer id;

  @NotNull
  @ManyToOne
  @JoinColumn(name = "usuario_id")
  public Usuario usuario;

  @NotBlank
  @Size(max = 200)
  public String asunto;

  @NotBlank
  @Column(columnDefinition = "TEXT")
  public String descripcion;

  @Size(max = 30)
  public String categoria = "general";

  @Size(max = 20)
  public String prioridad = "media";

  @Size(max = 30)
  public String estado = "abierto";

  @ManyToOne
  @JoinColumn(name = "asignado_a")
  public Usuario asignadoA;

  @Column(name = "fecha_creacion", insertable = false, updatable = false)
  public LocalDateTime fechaCreacion;

  @Column(name = "fecha_resolucion")
  public LocalDateTime fechaResolucion;
}
