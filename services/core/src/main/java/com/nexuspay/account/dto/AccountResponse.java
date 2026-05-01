package com.nexuspay.account.dto;

import java.math.BigDecimal;

public record AccountResponse(
    String id,
    String ifsc,
    BigDecimal balance,
    String status,
    boolean pinSet
) {}
