package com.morsepro.core;

import com.morsepro.model.Tone;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds the rhythm the instrument plays back on its own: tone-on and tone-off
 * slices at exact ITU proportions (dot 1, dash 3, element gap 1, letter gap 3,
 * word gap 7 units). The browser just follows this script.
 */
@Component
public class MorseTiming {

    public List<Tone> timeline(String morse, int wpm) {
        int unit = KeyStreamDecoder.unitMsFor(wpm);
        List<Tone> out = new ArrayList<>();
        if (morse == null || morse.isBlank()) {
            return out;
        }

        String[] words = morse.trim().split("\\s*/\\s*");
        for (int w = 0; w < words.length; w++) {
            if (w > 0) {
                out.add(new Tone(false, 7 * unit, null, "word"));
            }
            String[] letters = words[w].trim().split("\\s+");
            for (int l = 0; l < letters.length; l++) {
                if (l > 0) {
                    out.add(new Tone(false, 3 * unit, null, "letter"));
                }
                String letter = letters[l];
                for (int i = 0; i < letter.length(); i++) {
                    char symbol = letter.charAt(i);
                    if (symbol != '.' && symbol != '-') {
                        continue;
                    }
                    if (i > 0) {
                        out.add(new Tone(false, unit, null, null));
                    }
                    out.add(new Tone(true, symbol == '.' ? unit : 3 * unit,
                            String.valueOf(symbol), null));
                }
            }
        }
        return out;
    }

    public int totalMs(List<Tone> timeline) {
        int total = 0;
        for (Tone t : timeline) {
            total += t.ms();
        }
        return total;
    }
}
