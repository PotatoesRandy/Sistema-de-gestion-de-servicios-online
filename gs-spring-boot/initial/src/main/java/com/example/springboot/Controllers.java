package com.example.springboot;

import jakarta.validation.Valid;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

abstract class CrudController<T> {
  private final JpaRepository<T, Integer> repository;
  private final String resourceName;

  CrudController(JpaRepository<T, Integer> repository, String resourceName) {
    this.repository = repository;
    this.resourceName = resourceName;
  }

  @GetMapping
  List<T> list() {
    return repository.findAll();
  }

  @GetMapping("/{id}")
  T get(@PathVariable Integer id) {
    return repository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException(resourceName + " no encontrado: " + id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  T create(@Valid @RequestBody T entity) {
    setId(entity, null);
    return beforeCreate(entity);
  }

  @PutMapping("/{id}")
  T update(@PathVariable Integer id, @Valid @RequestBody T entity) {
    if (!repository.existsById(id)) {
      throw new ResourceNotFoundException(resourceName + " no encontrado: " + id);
    }
    setId(entity, id);
    return repository.save(entity);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@PathVariable Integer id) {
    if (!repository.existsById(id)) {
      throw new ResourceNotFoundException(resourceName + " no encontrado: " + id);
    }
    repository.deleteById(id);
  }

  T beforeCreate(T entity) {
    return repository.save(entity);
  }

  private void setId(T entity, Integer id) {
    try {
      Field idField = entity.getClass().getDeclaredField("id");
      idField.setAccessible(true);
      idField.set(entity, id);
    } catch (ReflectiveOperationException ex) {
      throw new IllegalStateException("No se pudo asignar el identificador.", ex);
    }
  }
}

@RestController
@RequestMapping("/")
class HomeController {
  @GetMapping
  Map<String, Object> home() {
    return Map.of(
        "status", "ok",
        "service", "servicios-online",
        "endpoints", List.of(
            "/api/health",
            "/api/usuarios",
            "/api/categorias",
            "/api/servicios",
            "/api/solicitudes",
            "/api/pagos",
            "/api/notificaciones",
            "/api/resenas",
            "/api/disponibilidad-tecnicos",
            "/api/reportes",
            "/api/historial-cambios",
            "/api/tickets-soporte"));
  }
}

@RestController
@RequestMapping("/health")
class HealthController {
  @GetMapping
  Map<String, String> health() {
    return Map.of("status", "ok", "service", "servicios-online");
  }
}

@RestController
@RequestMapping("/usuarios")
class UsuarioController extends CrudController<Usuario> {
  private final UsuarioRepository usuarioRepository;

  UsuarioController(UsuarioRepository usuarioRepository) {
    super(usuarioRepository, "Usuario");
    this.usuarioRepository = usuarioRepository;
  }

  @GetMapping("/username/{username}")
  Usuario byUsername(@PathVariable String username) {
    return usuarioRepository.findByUsername(username)
        .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + username));
  }

  @GetMapping("/email/{email}")
  Usuario byEmail(@PathVariable String email) {
    return usuarioRepository.findByEmail(email)
        .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + email));
  }
}

@RestController
@RequestMapping("/categorias")
class CategoriaServicioController extends CrudController<CategoriaServicio> {
  CategoriaServicioController(CategoriaServicioRepository repository) {
    super(repository, "Categoria");
  }
}

@RestController
@RequestMapping("/servicios")
class ServicioController extends CrudController<Servicio> {
  ServicioController(ServicioRepository repository) {
    super(repository, "Servicio");
  }
}

@RestController
@RequestMapping("/solicitudes")
class SolicitudController extends CrudController<Solicitud> {
  private final SolicitudRepository solicitudRepository;

  SolicitudController(SolicitudRepository solicitudRepository) {
    super(solicitudRepository, "Solicitud");
    this.solicitudRepository = solicitudRepository;
  }

  @GetMapping("/numero/{numeroSolicitud}")
  Solicitud byNumeroSolicitud(@PathVariable String numeroSolicitud) {
    return solicitudRepository.findByNumeroSolicitud(numeroSolicitud)
        .orElseThrow(() -> new ResourceNotFoundException("Solicitud no encontrada: " + numeroSolicitud));
  }

  @Override
  Solicitud beforeCreate(Solicitud solicitud) {
    if (solicitud.numeroSolicitud == null || solicitud.numeroSolicitud.isBlank()) {
      solicitud.numeroSolicitud = generarNumeroSolicitud();
    }
    return solicitudRepository.save(solicitud);
  }

  private String generarNumeroSolicitud() {
    String timestamp = DateTimeFormatter.ofPattern("yyMMddHHmmss").format(LocalDateTime.now());
    return "SOL-" + timestamp;
  }
}

@RestController
@RequestMapping("/pagos")
class PagoController extends CrudController<Pago> {
  PagoController(PagoRepository repository) {
    super(repository, "Pago");
  }
}

@RestController
@RequestMapping("/notificaciones")
class NotificacionController extends CrudController<Notificacion> {
  NotificacionController(NotificacionRepository repository) {
    super(repository, "Notificacion");
  }
}

@RestController
@RequestMapping("/resenas")
class ResenaServicioController extends CrudController<ResenaServicio> {
  ResenaServicioController(ResenaServicioRepository repository) {
    super(repository, "Resena");
  }
}

@RestController
@RequestMapping("/disponibilidad-tecnicos")
class DisponibilidadTecnicoController extends CrudController<DisponibilidadTecnico> {
  DisponibilidadTecnicoController(DisponibilidadTecnicoRepository repository) {
    super(repository, "Disponibilidad");
  }
}

@RestController
@RequestMapping("/reportes")
class ReporteSistemaController extends CrudController<ReporteSistema> {
  ReporteSistemaController(ReporteSistemaRepository repository) {
    super(repository, "Reporte");
  }
}

@RestController
@RequestMapping("/historial-cambios")
class HistorialCambioController extends CrudController<HistorialCambio> {
  HistorialCambioController(HistorialCambioRepository repository) {
    super(repository, "Historial");
  }
}

@RestController
@RequestMapping("/tickets-soporte")
class TicketSoporteController extends CrudController<TicketSoporte> {
  TicketSoporteController(TicketSoporteRepository repository) {
    super(repository, "Ticket de soporte");
  }
}
