package com.nexuspay.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NexusPayException.class)
    public ResponseEntity<CanonicalErrorResponse> handleNexusPayException(NexusPayException ex) {
        UUID correlationId = getCorrelationId();
        
        HttpStatus status = mapCodeToStatus(ex.getCode());
        
        CanonicalErrorResponse response = new CanonicalErrorResponse(
                ex.getCode(),
                ex.getMessage(),
                correlationId,
                ex.getDetails()
        );
        
        if (status.is5xxServerError()) {
            log.error("Server error: {}", ex.getMessage(), ex);
        } else {
            log.info("Business exception {}: {}", ex.getCode(), ex.getMessage());
        }
        
        return new ResponseEntity<>(response, status);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<CanonicalErrorResponse> handleGeneralException(Exception ex) {
        UUID correlationId = getCorrelationId();
        log.error("Unhandled exception", ex);
        
        CanonicalErrorResponse response = new CanonicalErrorResponse(
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred.",
                correlationId,
                null
        );
        
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private UUID getCorrelationId() {
        String corrIdStr = MDC.get("correlationId");
        if (corrIdStr != null) {
            try {
                return UUID.fromString(corrIdStr);
            } catch (IllegalArgumentException ignored) {}
        }
        return UUID.randomUUID(); // Fallback if filter didn't set it
    }

    private HttpStatus mapCodeToStatus(String code) {
        return switch (code) {
            case "UNAUTHENTICATED", "TOKEN_EXPIRED" -> HttpStatus.UNAUTHORIZED;
            case "UNAUTHORIZED", "INVALID_PIN" -> HttpStatus.FORBIDDEN;
            case "NOT_FOUND", "NO_ACCOUNT", "RECIPIENT_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "ACCOUNT_ALREADY_EXISTS", "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD" -> HttpStatus.CONFLICT;
            case "INSUFFICIENT_FUNDS", "CANNOT_PAY_SELF", "ACCOUNT_CLOSED" -> HttpStatus.UNPROCESSABLE_ENTITY;
            case "ACCOUNT_LOCKED" -> HttpStatus.LOCKED;
            case "BAD_REQUEST", "INVALID_INPUT" -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }
}
