package com.example.springboot;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
class AuthController {
  private final UsuarioRepository usuarioRepository;

  AuthController(UsuarioRepository usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  @PostMapping("/login")
  Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
    Usuario usuario = usuarioRepository.findByUsername(request.username())
        .orElseThrow(() -> new ResourceNotFoundException("Usuario o contrasena incorrectos."));

    if (!matchesPassword(request.password(), usuario.password)) {
      throw new ResourceNotFoundException("Usuario o contrasena incorrectos.");
    }

    return Map.of(
        "message", "Inicio de sesion correcto",
        "usuario", sanitize(usuario));
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> register(@Valid @RequestBody RegisterRequest request) {
    if (usuarioRepository.findByUsername(request.username()).isPresent()) {
      throw new IllegalArgumentException("El nombre de usuario ya esta registrado.");
    }
    if (usuarioRepository.findByEmail(request.email()).isPresent()) {
      throw new IllegalArgumentException("El correo ya esta registrado.");
    }

    Usuario usuario = new Usuario();
    usuario.username = request.username();
    usuario.email = request.email();
    usuario.password = sha256(request.password());
    usuario.nombre = request.nombre();
    usuario.apellido = request.apellido();
    usuario.telefono = request.telefono();
    usuario.tipoUsuario = "cliente";
    usuario.estado = "activo";

    Usuario saved = usuarioRepository.save(usuario);
    return Map.of(
        "message", "Registro correcto",
        "usuario", sanitize(saved));
  }

  private boolean matchesPassword(String rawPassword, String storedPassword) {
    return storedPassword != null
        && (storedPassword.equals(rawPassword) || storedPassword.equalsIgnoreCase(sha256(rawPassword)));
  }

  static Map<String, Object> sanitize(Usuario usuario) {
    return Map.of(
        "id", usuario.id,
        "username", usuario.username,
        "email", usuario.email,
        "nombre", usuario.nombre,
        "apellido", usuario.apellido,
        "telefono", usuario.telefono == null ? "" : usuario.telefono,
        "tipoUsuario", usuario.tipoUsuario,
        "estado", usuario.estado,
        "fechaRegistro", usuario.fechaRegistro == null ? LocalDateTime.now().toString() : usuario.fechaRegistro.toString());
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("No se pudo cifrar la contrasena.", ex);
    }
  }
}

record LoginRequest(
    @NotBlank @Size(max = 50) String username,
    @NotBlank @Size(max = 255) String password) {
}

record RegisterRequest(
    @NotBlank @Size(max = 50) String username,
    @NotBlank @Email @Size(max = 100) String email,
    @NotBlank @Size(max = 255) String password,
    @NotBlank @Size(max = 100) String nombre,
    @NotBlank @Size(max = 100) String apellido,
    @Size(max = 15) String telefono) {
}
