package com.nexuspay.vpa;

import com.nexuspay.entity.Account;
import com.nexuspay.entity.User;
import com.nexuspay.entity.Vpa;
import com.nexuspay.exception.NexusPayException;
import com.nexuspay.repository.AccountRepository;
import com.nexuspay.repository.UserRepository;
import com.nexuspay.repository.VpaRepository;
import com.nexuspay.vpa.dto.VpaCheckResponse;
import com.nexuspay.vpa.dto.VpaResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class VpaService {

    private final VpaRepository vpaRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public VpaService(VpaRepository vpaRepository, AccountRepository accountRepository, UserRepository userRepository) {
        this.vpaRepository = vpaRepository;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public VpaResponse bootstrapVpa(UUID userId) {
        Optional<Vpa> existing = vpaRepository.findByUserId(userId);
        if (existing.isPresent()) {
            return new VpaResponse(existing.get().getAddress());
        }

        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new NexusPayException("NO_ACCOUNT", "User has not opened an account yet."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NexusPayException("NOT_FOUND", "User not found"));

        String baseSlug = generateBaseSlug(user.getEmail());
        String address = baseSlug + "@nexus";
        int suffix = 1;

        while (vpaRepository.findByAddress(address).isPresent()) {
            address = baseSlug + suffix + "@nexus";
            suffix++;
        }

        Vpa vpa = new Vpa();
        vpa.setUserId(userId);
        vpa.setAccountId(account.getId());
        vpa.setAddress(address);
        vpaRepository.save(vpa);

        return new VpaResponse(address);
    }

    @Transactional(readOnly = true)
    public VpaCheckResponse checkVpa(UUID authenticatedUserId, String address) {
        Optional<Vpa> vpaOpt = vpaRepository.findByAddress(address);
        if (vpaOpt.isEmpty()) {
            return new VpaCheckResponse(address, null, false);
        }

        Vpa vpa = vpaOpt.get();
        if (vpa.getUserId().equals(authenticatedUserId)) {
            throw new NexusPayException("CANNOT_PAY_SELF", "You cannot transfer to your own VPA.");
        }

        User user = userRepository.findById(vpa.getUserId())
                .orElseThrow(() -> new NexusPayException("NOT_FOUND", "User not found"));

        return new VpaCheckResponse(address, user.getFullName(), true);
    }

    private String generateBaseSlug(String email) {
        String localPart = email.split("@")[0];
        String slug = localPart.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        return slug.length() > 20 ? slug.substring(0, 20) : slug;
    }
}
