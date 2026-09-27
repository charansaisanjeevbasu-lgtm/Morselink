package com.morsepro.core;

import com.morsepro.model.KeyPress;
import com.morsepro.model.KeyReading;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Turns the raw physical behaviour of the on-screen instrument - "held down for
 * 118 ms, waited 402 ms, held down for 355 ms" - into dots, dashes, letters and
 * words, using the ITU timing ratios.
 *
 * The browser measures milliseconds. Every judgement about what those
 * milliseconds *mean* is made here.
 */
@Component
public class KeyStreamDecoder {

    /** A dot is 1 unit, a dash 3 units; anything past this boundary is a dash. */
    private static final double DASH_THRESHOLD_UNITS = 2.0;
    /** Element gaps are 1 unit, letter gaps 3, word gaps 7. */
    private static final double LETTER_GAP_UNITS = 2.0;
    private static final double WORD_GAP_UNITS = 5.0;
    private static final String WORD_MARKER = "/";

    private final MorseDecoder decoder;

    public KeyStreamDecoder(MorseDecoder decoder) {
        this.decoder = decoder;
    }

    /** Standard PARIS formula: one dot at W words per minute lasts 1200/W ms. */
    public static int unitMsFor(int wpm) {
        return Math.max(20, 1200 / Math.max(1, wpm));
    }

    public KeyReading read(List<KeyPress> presses, int wpm) {
        return read(presses, wpm, 0L);
    }

    /**
     * @param trailingGapMs silence since the final release. Once it passes the
     *                      letter gap the character is finished, and once it
     *                      passes the word gap the word is too.
     */
    public KeyReading read(List<KeyPress> presses, int wpm, long trailingGapMs) {
        List<KeyPress> safe = presses == null ? List.of() : presses;
        int unit = wpm > 0 ? unitMsFor(wpm) : estimateUnit(safe);

        // Finished letters, plus "/" markers where a word ended.
        List<String> tokens = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        List<String> symbols = new ArrayList<>();

        for (int i = 0; i < safe.size(); i++) {
            KeyPress press = safe.get(i);

            if (i > 0) {
                long gap = Math.max(0, press.gapBeforeMs());
                if (gap >= WORD_GAP_UNITS * unit) {
                    flush(current, tokens);
                    tokens.add(WORD_MARKER);
                } else if (gap >= LETTER_GAP_UNITS * unit) {
                    flush(current, tokens);
                }
                // anything shorter keeps us inside the same character
            }

            String symbol = symbolFor(press, unit);
            symbols.add(symbol);
            current.append(symbol);
        }

        if (trailingGapMs >= LETTER_GAP_UNITS * unit) {
            // The letter is finished. No word marker yet - a word only ends
            // once something follows it, and that gap arrives with the next press.
            flush(current, tokens);
        }

        return buildReading(tokens, current.toString(), symbols, unit, wpm);
    }

    /** Move the character being keyed into the finished list. */
    private void flush(StringBuilder current, List<String> tokens) {
        if (current.length() > 0) {
            tokens.add(current.toString());
            current.setLength(0);
        }
    }

    /** Dot or dash for a single press: the paddle states it outright, the straight key is timed. */
    private String symbolFor(KeyPress press, int unit) {
        String forced = press.forced();
        if ("dot".equalsIgnoreCase(forced)) {
            return ".";
        }
        if ("dash".equalsIgnoreCase(forced)) {
            return "-";
        }
        return press.durationMs() >= DASH_THRESHOLD_UNITS * unit ? "-" : ".";
    }

    private KeyReading buildReading(List<String> tokens, String pending,
                                    List<String> symbols, int unit, int wpm) {
        String completedMorse = String.join(" ", tokens);
        String fullMorse = (completedMorse + " " + pending).trim().replaceAll(" +", " ");

        String decoded = decoder.decode(completedMorse);
        // A word break with nothing after it yet still separates what comes next.
        if (!tokens.isEmpty() && WORD_MARKER.equals(tokens.get(tokens.size() - 1))) {
            decoded = decoded + " ";
        }

        Character pendingChar = pending.isEmpty() ? null : MorseAlphabet.charFor(pending);

        return new KeyReading(
                fullMorse,
                decoded,
                pending,
                pendingChar == null ? null : String.valueOf(pendingChar),
                symbols.isEmpty() ? null : symbols.get(symbols.size() - 1),
                symbols.size(),
                unit,
                wpm > 0 ? wpm : 1200 / unit,
                (int) Math.round(DASH_THRESHOLD_UNITS * unit),
                (int) Math.round(LETTER_GAP_UNITS * unit),
                (int) Math.round(WORD_GAP_UNITS * unit)
        );
    }

    /**
     * When the operator has not told us their speed, infer the dot length from
     * the shortest press they have made so far (their own natural dot).
     */
    private int estimateUnit(List<KeyPress> presses) {
        long shortest = Long.MAX_VALUE;
        for (KeyPress p : presses) {
            if (p.durationMs() > 0) {
                shortest = Math.min(shortest, p.durationMs());
            }
        }
        if (shortest == Long.MAX_VALUE) {
            return unitMsFor(15);
        }
        return (int) Math.min(600, Math.max(40, shortest));
    }
}
