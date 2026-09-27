package com.morsepro.model;

public record DecodeResponse(String morse, String normalised, String text, boolean valid) {
}
