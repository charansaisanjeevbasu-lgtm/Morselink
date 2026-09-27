package com.morsepro.core;

import com.morsepro.model.KeyPress;
import com.morsepro.model.KeyReading;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MorseCoreTest {

    private final MorseEncoder encoder = new MorseEncoder();
    private final MorseDecoder decoder = new MorseDecoder();
    private final KeyStreamDecoder keyStream = new KeyStreamDecoder(decoder);
    private final MorseTiming timing = new MorseTiming();

    @Test
    void encodesLettersDigitsAndWords() {
        assertEquals(".... . .-.. .-.. ---", encoder.encode("hello"));
        assertEquals("... --- ...", encoder.encode("SOS"));
        assertEquals(".... .. / - .... . .-. .", encoder.encode("hi there"));
        assertEquals("-.... ....-", encoder.encode("64"));
    }

    @Test
    void decodesBackToTheOriginal() {
        String text = "THE QUICK BROWN FOX 1234 JUMPS OVER THE LAZY DOG 567890";
        assertEquals(text, decoder.decode(encoder.encode(text)));
    }

    @Test
    void decoderAcceptsPastedVariants() {
        assertEquals("SOS", decoder.decode("··· ——— ···"));
        assertEquals("HI THERE", decoder.decode(".... .. | - .... . .-. ."));
        assertEquals("OK", decoder.decode("---   -.-"));
    }

    @Test
    void unknownPatternBecomesPlaceholderRatherThanAnException() {
        assertEquals(String.valueOf(MorseAlphabet.UNKNOWN), decoder.decode("........"));
        assertFalse(decoder.isFullyValid("........"));
        assertTrue(decoder.isFullyValid(".... ."));
    }

    @Test
    void straightKeyTimingProducesLetters() {
        // 15 wpm -> unit 80ms, dash threshold 160ms, letter gap 160ms
        List<KeyPress> presses = List.of(
                new KeyPress(70, 0, null),      // .
                new KeyPress(70, 80, null),     // .
                new KeyPress(70, 80, null),     // .
                new KeyPress(70, 80, null),     // .   -> H
                new KeyPress(70, 300, null),    // .   -> E (letter gap)
                new KeyPress(300, 240, null)    // -   -> T pending
        );
        KeyReading reading = keyStream.read(presses, 15);
        assertEquals(".... . -", reading.morse());
        assertEquals("HE", reading.text());
        assertEquals("-", reading.pendingSymbols());
        assertEquals("T", reading.pendingChar());
        assertEquals(80, reading.unitMs());
    }

    @Test
    void longPauseStartsANewWord() {
        List<KeyPress> presses = List.of(
                new KeyPress(70, 0, null),     // E
                new KeyPress(70, 900, null)    // long gap -> word break
        );
        KeyReading reading = keyStream.read(presses, 15);
        assertTrue(reading.morse().contains("/"));
        assertEquals("E ", reading.text());
    }

    @Test
    void paddleStatesItsOwnSymbols() {
        List<KeyPress> presses = List.of(
                new KeyPress(30, 0, "dot"),
                new KeyPress(30, 80, "dash"),
                new KeyPress(30, 240, "dot")
        );
        KeyReading reading = keyStream.read(presses, 15);
        assertEquals(".- .", reading.morse());
        assertEquals("A", reading.text());
    }

    @Test
    void speedIsInferredWhenNoWpmGiven() {
        List<KeyPress> presses = List.of(
                new KeyPress(100, 0, null),
                new KeyPress(310, 110, null)
        );
        KeyReading reading = keyStream.read(presses, 0);
        assertEquals(100, reading.unitMs());
        assertEquals(".-", reading.pendingSymbols());
    }

    @Test
    void playbackTimelineFollowsItuProportions() {
        var timeline = timing.timeline(encoder.encode("E T"), 15);
        // E(1u on) + word gap(7u) + T(3u on)
        assertEquals(3, timeline.size());
        assertTrue(timeline.get(0).on());
        assertEquals(80, timeline.get(0).ms());
        assertFalse(timeline.get(1).on());
        assertEquals(560, timeline.get(1).ms());
        assertEquals("word", timeline.get(1).boundary());
        assertEquals(240, timeline.get(2).ms());
        assertEquals(880, timing.totalMs(timeline));
    }

    @Test
    void emptyInputIsSafeEverywhere() {
        assertEquals("", encoder.encode(null));
        assertEquals("", decoder.decode("   "));
        assertEquals("", keyStream.read(List.of(), 15).morse());
        assertTrue(timing.timeline("", 15).isEmpty());
    }

    @Test
    void stoppingForALetterGapSettlesTheFinalCharacter() {
        List<KeyPress> presses = List.of(
                new KeyPress(70, 0, null),
                new KeyPress(300, 80, null)     // .-  = A, still pending
        );
        assertEquals("A", keyStream.read(presses, 15).pendingChar());
        assertEquals("", keyStream.read(presses, 15).text());

        // operator stops keying for 3 units - the letter is now finished
        KeyReading settled = keyStream.read(presses, 15, 260);
        assertEquals("A", settled.text());
        assertEquals("", settled.pendingSymbols());
        assertNull(settled.pendingChar());
    }
}
