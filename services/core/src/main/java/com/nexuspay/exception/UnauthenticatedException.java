package com.nexuspay.exception;

public class UnauthenticatedException extends NexusPayException {
    public UnauthenticatedException(String message) {
        super("UNAUTHENTICATED", message);
    }
}
