package com.morsepro.core;

import org.springframework.stereotype.Component;

/** English -> Morse. Letters are separated by a space, words by " / ". */
@Component
public class MorseEncoder {

    public static final String LETTER_GAP = " ";
    public static final String WORD_GAP = " / ";

    public String encode(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        String[] words = text.trim().toUpperCase().split("\\s+");

        for (int w = 0; w < words.length; w++) {
            if (w > 0) {
                out.append(WORD_GAP);
            }
            String word = words[w];
            boolean firstLetterWritten = false;
            for (int i = 0; i < word.length(); i++) {
                String pattern = MorseAlphabet.patternFor(word.charAt(i));
                if (pattern == null) {
                    continue; // silently skip characters Morse cannot carry
                }
                if (firstLetterWritten) {
                    out.append(LETTER_GAP);
                }
                out.append(pattern);
                firstLetterWritten = true;
            }
        }
        return out.toString().trim();
    }

    /** Characters in the input that have no Morse equivalent, for a UI warning. */
    public String unsupportedCharacters(String text) {
        if (text == null) {
            return "";
        }
        StringBuilder bad = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (Character.isWhitespace(c) || MorseAlphabet.isSupported(c)) {
                continue;
            }
            if (bad.indexOf(String.valueOf(c)) < 0) {
                bad.append(c);
            }
        }
        return bad.toString();
    }
}
