package com.nexuspay.repository;

import com.nexuspay.entity.PspTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PspTransactionRepository extends JpaRepository<PspTransaction, UUID> {
    Optional<PspTransaction> findByTxnReference(String txnReference);
    
    @org.springframework.data.jpa.repository.Query("SELECT t FROM PspTransaction t WHERE t.senderUserId = :userId OR t.receiverUserId = :userId")
    Page<PspTransaction> findByUserHistory(UUID userId, Pageable pageable);
}
