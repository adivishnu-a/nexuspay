package com.nexuspay.vpa;

import com.nexuspay.vpa.dto.VpaCheckResponse;
import com.nexuspay.vpa.dto.VpaResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/psp")
public class VpaController {

    private final VpaService vpaService;

    public VpaController(VpaService vpaService) {
        this.vpaService = vpaService;
    }

    @PostMapping("/onboarding/bootstrap-vpa")
    public ResponseEntity<VpaResponse> bootstrapVpa(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(vpaService.bootstrapVpa(userId));
    }

    @GetMapping("/vpas/check")
    public ResponseEntity<VpaCheckResponse> checkVpa(
            @AuthenticationPrincipal UUID userId,
            @RequestParam String address
    ) {
        VpaCheckResponse response = vpaService.checkVpa(userId, address);
        if (!response.exists()) {
            return ResponseEntity.status(404).body(response);
        }
        return ResponseEntity.ok(response);
    }
}
