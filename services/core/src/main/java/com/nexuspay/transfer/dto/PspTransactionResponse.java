package com.nexuspay.transfer.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PspTransactionResponse(
    UUID id,
    String txnReference,
    BigDecimal amount,
    String direction,
    String counterpartyVpa,
    String counterpartyName,
    String status,
    String failureCode,
    OffsetDateTime createdAt
) {}
