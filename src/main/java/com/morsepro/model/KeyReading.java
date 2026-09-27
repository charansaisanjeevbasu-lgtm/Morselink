package com.morsepro.model;

/** Java's verdict on everything the operator has keyed so far. */
public record KeyReading(
        String morse,          // full stream, e.g. ".... . .-.. / .--"
        String text,           // decoded English of the finished letters
        String pendingSymbols,  // the character still being keyed, e.g. ".-"
        String pendingChar,     // what it would become right now, or null
        String lastSymbol,      // "." or "-" from the most recent press
        int symbolCount,
        int unitMs,             // dot length in use
        int wpm,
        int dashThresholdMs,    // hold longer than this and it is a dash
        int letterGapMs,        // pause longer than this ends the letter
        int wordGapMs           // pause longer than this ends the word
) {
}
