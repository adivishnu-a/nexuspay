package com.nexuspay.faucet;

import com.nexuspay.account.AccountService;
import com.nexuspay.account.dto.AccountResponse;
import com.nexuspay.entity.Account;
import com.nexuspay.repository.AccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class FaucetService {

    private final AccountService accountService;
    private final AccountRepository accountRepository;

    public FaucetService(AccountService accountService, AccountRepository accountRepository) {
        this.accountService = accountService;
        this.accountRepository = accountRepository;
    }

    @Transactional
    public AccountResponse deposit(UUID userId, String accountId, BigDecimal amount) {
        Account account = accountService.getAccountAndVerifyOwnership(userId, accountId);
        
        // Single row update via JPA dirty checking
        account.setBalance(account.getBalance().add(amount).setScale(2, java.math.RoundingMode.UNNECESSARY));
        Account saved = accountRepository.save(account);

        return new AccountResponse(
                saved.getId(),
                saved.getIfsc(),
                saved.getBalance(),
                saved.getStatus(),
                saved.getPinHash() != null
        );
    }
}
