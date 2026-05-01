package com.nexuspay.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.nexuspay.exception.NexusPayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
public class GoogleIdTokenVerifierWrapper {

    private final GoogleIdTokenVerifier verifier;

    public GoogleIdTokenVerifierWrapper(@Value("${google.client-id}") String clientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(clientId))
                .build();
    }

    public GoogleIdToken.Payload verify(String idTokenString) {
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                return idToken.getPayload();
            } else {
                throw new NexusPayException("UNAUTHENTICATED", "Invalid Google ID token.");
            }
        } catch (Exception e) {
            throw new NexusPayException("UNAUTHENTICATED", "Failed to verify Google ID token.");
        }
    }
}
