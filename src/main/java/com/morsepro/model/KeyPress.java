package com.morsepro.model;

/**
 * One physical press of the instrument as observed by the browser.
 *
 * @param durationMs   how long the contact was closed
 * @param gapBeforeMs  silence between the previous release and this press
 * @param forced       "dot" / "dash" when the instrument itself decides (paddle),
 *                     null for a straight key where duration decides
 */
public record KeyPress(long durationMs, long gapBeforeMs, String forced) {
}
