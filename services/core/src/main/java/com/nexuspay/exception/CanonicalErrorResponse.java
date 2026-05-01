package com.nexuspay.exception;

import java.util.Map;
import java.util.UUID;

public record CanonicalErrorResponse(
    String code,
    String message,
    UUID correlationId,
    Map<String, Object> details
) {}
