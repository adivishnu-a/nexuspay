package com.nexuspay.vpa.dto;

public record VpaCheckResponse(
    String address,
    String recipientName,
    boolean exists
) {}
