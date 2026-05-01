package com.nexuspay.transfer.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TransactionResponse(
    String transactionId,
    String txnReference,
    String status,
    String failureCode,
    BigDecimal amount,
    String receiverVpa,
    String receiverName,
    String senderName,
    String direction, // "DEBIT" or "CREDIT" from the requester's perspective
    OffsetDateTime createdAt
) {}
