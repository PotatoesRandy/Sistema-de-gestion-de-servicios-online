package com.example.springboot;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
  Optional<Usuario> findByUsername(String username);
  Optional<Usuario> findByEmail(String email);
}

interface CategoriaServicioRepository extends JpaRepository<CategoriaServicio, Integer> {
}

interface ServicioRepository extends JpaRepository<Servicio, Integer> {
}

interface SolicitudRepository extends JpaRepository<Solicitud, Integer> {
  Optional<Solicitud> findByNumeroSolicitud(String numeroSolicitud);
}

interface PagoRepository extends JpaRepository<Pago, Integer> {
}

interface NotificacionRepository extends JpaRepository<Notificacion, Integer> {
}

interface ResenaServicioRepository extends JpaRepository<ResenaServicio, Integer> {
}

interface DisponibilidadTecnicoRepository extends JpaRepository<DisponibilidadTecnico, Integer> {
}

interface ReporteSistemaRepository extends JpaRepository<ReporteSistema, Integer> {
}

interface HistorialCambioRepository extends JpaRepository<HistorialCambio, Integer> {
}

interface TicketSoporteRepository extends JpaRepository<TicketSoporte, Integer> {
}
