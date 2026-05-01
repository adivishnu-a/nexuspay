package com.nexuspay.auth.dto;

public record UserResponse(
    String id,
    String email,
    String fullName,
    boolean hasAccount,
    boolean hasVpa
) {}
