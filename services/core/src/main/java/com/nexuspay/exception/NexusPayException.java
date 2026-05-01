package com.nexuspay.exception;

import java.util.Map;

public class NexusPayException extends RuntimeException {
    private final String code;
    private final Map<String, Object> details;

    public NexusPayException(String code, String message) {
        super(message);
        this.code = code;
        this.details = Map.of();
    }

    public NexusPayException(String code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details != null ? details : Map.of();
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}
