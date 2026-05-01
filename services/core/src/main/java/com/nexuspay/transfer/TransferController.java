package com.nexuspay.transfer;

import com.nexuspay.transfer.dto.BalanceResponse;

import com.nexuspay.transfer.dto.TransferRequest;
import com.nexuspay.transfer.dto.TransferResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/psp")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping("/transfer/vpa")
    public ResponseEntity<TransferResponse> transfer(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody TransferRequest request
    ) {
        return ResponseEntity.ok(transferService.transfer(userId, request));
    }

    @GetMapping("/balance")
    public ResponseEntity<BalanceResponse> getBalance(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(new BalanceResponse(transferService.getBalance(userId)));
    }

    @GetMapping("/transfer/status/{txnReference}")
    public ResponseEntity<TransferResponse> getStatus(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String txnReference
    ) {
        return ResponseEntity.ok(transferService.getStatus(userId, txnReference));
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<com.nexuspay.transfer.dto.PspTransactionResponse>> listTransactions(
            @AuthenticationPrincipal UUID userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(transferService.listUserTransactions(userId, pageable));
    }
}
