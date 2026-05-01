package com.nexuspay.transfer.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record TransferRequest(
    @NotBlank(message = "Receiver VPA is required")
    String receiverVpa,
    
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Minimum transfer is 1.00")
    BigDecimal amount,
    
    @NotBlank(message = "PIN is required")
    @Pattern(regexp = "^\\d{4}$", message = "PIN must be exactly 4 digits")
    String pin,
    
    @NotBlank(message = "Transaction reference is required")
    String txnReference
) {}
