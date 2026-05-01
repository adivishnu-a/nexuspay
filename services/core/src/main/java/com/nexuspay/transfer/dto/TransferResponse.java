package com.nexuspay.transfer.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TransferResponse(
    String transactionId,
    String txnReference,
    String status,
    String failureCode,
    BigDecimal amount,
    String receiverVpa,
    String receiverName,
    OffsetDateTime createdAt
) {}
