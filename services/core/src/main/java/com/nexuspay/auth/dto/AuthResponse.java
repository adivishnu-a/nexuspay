package com.nexuspay.auth.dto;

public record AuthResponse(
    String accessToken,
    UserResponse user
) {}
