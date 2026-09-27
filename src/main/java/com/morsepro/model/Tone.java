package com.morsepro.model;

/**
 * A single slice of the playback timeline.
 *
 * @param on       true while the key is down and the tone sounds
 * @param ms       how long this slice lasts
 * @param symbol   "." "-" or null for silence
 * @param boundary null, "letter" or "word" - what this silence separates
 */
public record Tone(boolean on, int ms, String symbol, String boundary) {
}
