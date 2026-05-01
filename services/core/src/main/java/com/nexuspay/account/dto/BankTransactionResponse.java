package com.nexuspay.account.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record BankTransactionResponse(
    UUID id,
    String txnReference,
    BigDecimal amount,
    String direction,
    String txnType,
    String counterpartyName,
    String status,
    OffsetDateTime createdAt
) {}
