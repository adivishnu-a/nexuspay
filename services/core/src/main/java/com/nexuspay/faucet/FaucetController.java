package com.nexuspay.faucet;

import com.nexuspay.account.dto.AccountResponse;
import com.nexuspay.faucet.dto.DepositRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bank/accounts/{id}/deposit")
public class FaucetController {

    private final FaucetService faucetService;

    public FaucetController(FaucetService faucetService) {
        this.faucetService = faucetService;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> deposit(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String id,
            @Valid @RequestBody DepositRequest request
    ) {
        return ResponseEntity.ok(faucetService.deposit(userId, id, request.amount()));
    }
}
