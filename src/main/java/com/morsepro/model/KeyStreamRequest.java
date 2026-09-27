package com.morsepro.model;

import java.util.List;

/**
 * @param wpm            0 means "work out my speed from my own keying"
 * @param presses        every press so far, oldest first
 * @param trailingGapMs  silence since the last release; lets Java close off the
 *                       final letter or word once the operator stops keying
 */
public record KeyStreamRequest(int wpm, List<KeyPress> presses, long trailingGapMs) {
}
