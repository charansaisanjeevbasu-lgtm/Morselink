package com.morsepro.model;

import java.util.List;

public record PlaybackResponse(String morse, int wpm, int unitMs, int totalMs, List<Tone> timeline) {
}
