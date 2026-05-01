package com.nexuspay.account;

import com.nexuspay.account.dto.AccountResponse;
import com.nexuspay.account.dto.PinRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bank/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> openAccount(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.openAccount(userId));
    }

    @GetMapping
    public ResponseEntity<AccountResponse> getAccount(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(accountService.findOwnAccount(userId));
    }

    @PutMapping("/{id}/pin")
    public ResponseEntity<Void> setPin(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String id,
            @Valid @RequestBody PinRequest request
    ) {
        accountService.setPin(userId, id, request.pin());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/pin/reset")
    public ResponseEntity<Void> resetPin(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String id,
            @Valid @RequestBody PinRequest request
    ) {
        accountService.resetPin(userId, id, request.pin());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<Page<com.nexuspay.account.dto.BankTransactionResponse>> listTransactions(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String id,
            @PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(accountService.listAccountTransactions(userId, id, pageable));
    }
}
