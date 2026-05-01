package com.nexuspay.faucet.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DepositRequest(
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Minimum deposit is 1.00")
    @DecimalMax(value = "100000.00", message = "Maximum deposit is 100000.00")
    BigDecimal amount
) {}
