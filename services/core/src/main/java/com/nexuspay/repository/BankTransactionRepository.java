package com.nexuspay.repository;

import com.nexuspay.entity.BankTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, UUID> {
    Page<BankTransaction> findByAccountId(String accountId, Pageable pageable);
}
