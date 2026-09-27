package com.morsepro.core;

import org.springframework.stereotype.Component;

/**
 * Morse -> English. Deliberately forgiving: accepts the typographic variants
 * people actually paste in ( · • * for dot, - _ = for dash, / | for word break )
 * and never throws on a malformed pattern.
 */
@Component
public class MorseDecoder {

    public String decode(String morse) {
        if (morse == null || morse.isBlank()) {
            return "";
        }
        String normalised = normalise(morse);
        StringBuilder out = new StringBuilder();

        // Word boundaries are "/" or a run of 3+ spaces.
        String[] words = normalised.split("\\s*/\\s*|\\s{3,}");
        for (int w = 0; w < words.length; w++) {
            if (w > 0) {
                out.append(' ');
            }
            for (String letter : words[w].trim().split("\\s+")) {
                if (letter.isEmpty()) {
                    continue;
                }
                Character c = MorseAlphabet.charFor(letter);
                out.append(c == null ? MorseAlphabet.UNKNOWN : c);
            }
        }
        return out.toString().trim();
    }

    /** Collapse every accepted dot/dash/separator spelling down to '.', '-', ' ' and '/'. */
    public String normalise(String morse) {
        return morse
                .replace('·', '.')  // middle dot
                .replace('•', '.')  // bullet
                .replace('*', '.')
                .replace('–', '-')  // en dash
                .replace('—', '-')  // em dash
                .replace('−', '-')  // minus sign
                .replace('_', '-')
                .replace('|', '/')
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("[^.\\-/ ]", "")
                .replaceAll(" +", " ")
                .trim();
    }

    /** True when every letter group in the input maps to a real character. */
    public boolean isFullyValid(String morse) {
        String n = normalise(morse);
        if (n.isEmpty()) {
            return true;
        }
        for (String group : n.split("[/ ]+")) {
            if (!group.isEmpty() && MorseAlphabet.charFor(group) == null) {
                return false;
            }
        }
        return true;
    }
}
