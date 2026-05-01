package com.nexuspay.auth;

import com.nexuspay.auth.dto.AuthResponse;
import com.nexuspay.auth.dto.GoogleLoginRequest;
import com.nexuspay.auth.dto.UserResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final boolean cookieSecure;
    private final int refreshTtlSeconds;

    public AuthController(
            AuthService authService,
            @Value("${nexuspay.cookie.secure:false}") boolean cookieSecure,
            @Value("${jwt.refresh-ttl-seconds:604800}") int refreshTtlSeconds
    ) {
        this.authService = authService;
        this.cookieSecure = cookieSecure;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleSignIn(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletResponse response
    ) {
        AuthService.AuthResult result = authService.googleSignIn(request.idToken());
        setRefreshCookie(response, result.refreshToken(), refreshTtlSeconds);
        return ResponseEntity.ok(new AuthResponse(result.accessToken(), result.user()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = getRefreshCookie(request);
        if (refreshToken == null) {
            return ResponseEntity.status(401).build();
        }

        AuthService.AuthResult result = authService.refresh(refreshToken);
        setRefreshCookie(response, result.refreshToken(), refreshTtlSeconds);
        return ResponseEntity.ok(new AuthResponse(result.accessToken(), result.user()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = getRefreshCookie(request);
        authService.logout(refreshToken);
        
        // Clear cookie
        setRefreshCookie(response, "", 0);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(authService.me(userId));
    }

    private void setRefreshCookie(HttpServletResponse response, String value, int maxAge) {
        Cookie cookie = new Cookie("refresh_token", value);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "None");
        response.addCookie(cookie);
    }

    private String getRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refresh_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
