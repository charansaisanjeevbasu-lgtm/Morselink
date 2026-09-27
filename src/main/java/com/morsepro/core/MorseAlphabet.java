package com.morsepro.core;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The single source of truth for the ITU Morse code alphabet.
 * Nothing in the browser holds a copy of this table - the front end only
 * measures how long the operator held the key and asks Java what it meant.
 */
public final class MorseAlphabet {

    /** Character -> Morse pattern, in a stable order so the on-screen chart looks sane. */
    private static final Map<Character, String> TO_MORSE = new LinkedHashMap<>();
    /** Morse pattern -> character. */
    private static final Map<String, Character> FROM_MORSE = new LinkedHashMap<>();

    /** Placeholder emitted when a pattern is not in the alphabet. */
    public static final char UNKNOWN = '•'; // shown as a bullet in the UI

    static {
        put('A', ".-");    put('B', "-...");  put('C', "-.-.");  put('D', "-..");
        put('E', ".");     put('F', "..-.");  put('G', "--.");   put('H', "....");
        put('I', "..");    put('J', ".---");  put('K', "-.-");   put('L', ".-..");
        put('M', "--");    put('N', "-.");    put('O', "---");   put('P', ".--.");
        put('Q', "--.-");  put('R', ".-.");   put('S', "...");   put('T', "-");
        put('U', "..-");   put('V', "...-");  put('W', ".--");   put('X', "-..-");
        put('Y', "-.--");  put('Z', "--..");

        put('0', "-----"); put('1', ".----"); put('2', "..---"); put('3', "...--");
        put('4', "....-"); put('5', "....."); put('6', "-...."); put('7', "--...");
        put('8', "---.."); put('9', "----.");

        put('.', ".-.-.-"); put(',', "--..--"); put('?', "..--..");
        put('\'', ".----."); put('!', "-.-.--"); put('/', "-..-.");
        put('(', "-.--.");  put(')', "-.--.-"); put('&', ".-...");
        put(':', "---...");  put(';', "-.-.-."); put('=', "-...-");
        put('+', ".-.-.");  put('-', "-....-"); put('_', "..--.-");
        put('"', ".-..-."); put('$', "...-..-"); put('@', ".--.-.");
    }

    private static void put(char c, String pattern) {
        TO_MORSE.put(c, pattern);
        FROM_MORSE.put(pattern, c);
    }

    private MorseAlphabet() {
    }

    public static String patternFor(char c) {
        return TO_MORSE.get(Character.toUpperCase(c));
    }

    public static boolean isSupported(char c) {
        return TO_MORSE.containsKey(Character.toUpperCase(c));
    }

    public static Character charFor(String pattern) {
        return FROM_MORSE.get(pattern);
    }

    /** Ordered pairs for the UI chart (letters, then digits, then punctuation). */
    public static Map<String, String> chart() {
        Map<String, String> out = new LinkedHashMap<>();
        TO_MORSE.forEach((k, v) -> out.put(String.valueOf(k), v));
        return out;
    }
}
