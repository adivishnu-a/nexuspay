package com.nexuspay.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;

import com.nexuspay.auth.dto.UserResponse;
import com.nexuspay.entity.RefreshToken;
import com.nexuspay.entity.User;
import com.nexuspay.exception.UnauthenticatedException;
import com.nexuspay.repository.AccountRepository;
import com.nexuspay.repository.RefreshTokenRepository;
import com.nexuspay.repository.UserRepository;
import com.nexuspay.repository.VpaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthService {

    private final GoogleIdTokenVerifierWrapper googleVerifier;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final VpaRepository vpaRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final long refreshTtlSeconds;

    public AuthService(
            GoogleIdTokenVerifierWrapper googleVerifier,
            UserRepository userRepository,
            AccountRepository accountRepository,
            VpaRepository vpaRepository,
            RefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            @Value("${jwt.refresh-ttl-seconds}") long refreshTtlSeconds
    ) {
        this.googleVerifier = googleVerifier;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.vpaRepository = vpaRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    @Transactional
    public AuthResult googleSignIn(String idTokenString) {
        GoogleIdToken.Payload payload = googleVerifier.verify(idTokenString);
        String googleSub = payload.getSubject();
        String email = payload.getEmail();
        String name = (String) payload.get("name");

        User user = userRepository.findByGoogleSub(googleSub)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setGoogleSub(googleSub);
                    newUser.setEmail(email);
                    newUser.setFullName(name != null ? name : email);
                    return userRepository.save(newUser);
                });

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        
        UUID familyId = UUID.randomUUID();
        String plaintextRefreshToken = generateRandomToken();
        String hashedRefreshToken = hashToken(plaintextRefreshToken);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setFamilyId(familyId);
        refreshToken.setTokenHash(hashedRefreshToken);
        refreshToken.setExpiresAt(OffsetDateTime.now().plusSeconds(refreshTtlSeconds));
        refreshTokenRepository.save(refreshToken);

        return new AuthResult(accessToken, plaintextRefreshToken, buildUserResponse(user));
    }

    @Transactional
    public AuthResult refresh(String plaintextRefreshToken) {
        String hashedToken = hashToken(plaintextRefreshToken);
        RefreshToken token = refreshTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> new UnauthenticatedException("Invalid refresh token"));

        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new UnauthenticatedException("Invalid refresh token");
        }

        if (token.getUsedAt() != null) {
            refreshTokenRepository.revokeFamily(token.getFamilyId());
            throw new UnauthenticatedException("Refresh token reuse detected. Session revoked.");
        }

        token.setUsedAt(OffsetDateTime.now());
        refreshTokenRepository.save(token);

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new UnauthenticatedException("User not found"));

        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String newPlaintextRefreshToken = generateRandomToken();
        String newHashedRefreshToken = hashToken(newPlaintextRefreshToken);

        RefreshToken newRefreshToken = new RefreshToken();
        newRefreshToken.setUserId(user.getId());
        newRefreshToken.setFamilyId(token.getFamilyId()); // Keep same family
        newRefreshToken.setTokenHash(newHashedRefreshToken);
        newRefreshToken.setExpiresAt(OffsetDateTime.now().plusSeconds(refreshTtlSeconds));
        refreshTokenRepository.save(newRefreshToken);

        return new AuthResult(newAccessToken, newPlaintextRefreshToken, buildUserResponse(user));
    }

    @Transactional
    public void logout(String plaintextRefreshToken) {
        if (plaintextRefreshToken == null || plaintextRefreshToken.isBlank()) return;
        
        String hashedToken = hashToken(plaintextRefreshToken);
        refreshTokenRepository.findByTokenHash(hashedToken).ifPresent(token -> {
            token.setRevokedAt(OffsetDateTime.now());
            refreshTokenRepository.save(token);
        });
    }

    @Transactional(readOnly = true)
    public UserResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthenticatedException("User not found"));
        return buildUserResponse(user);
    }

    private UserResponse buildUserResponse(User user) {
        boolean hasAccount = accountRepository.findByUserId(user.getId()).isPresent();
        boolean hasVpa = vpaRepository.findByUserId(user.getId()).isPresent();
        return new UserResponse(
                user.getId().toString(),
                user.getEmail(),
                user.getFullName(),
                hasAccount,
                hasVpa
        );
    }

    private String generateRandomToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public record AuthResult(String accessToken, String refreshToken, UserResponse user) {}
}
