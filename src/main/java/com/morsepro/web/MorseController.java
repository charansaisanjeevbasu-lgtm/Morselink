package com.morsepro.web;

import com.morsepro.core.KeyStreamDecoder;
import com.morsepro.core.MorseAlphabet;
import com.morsepro.core.MorseDecoder;
import com.morsepro.core.MorseEncoder;
import com.morsepro.core.MorseTiming;
import com.morsepro.model.*;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Every Morse decision the front end needs, and nothing else. */
@RestController
@RequestMapping(value = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
public class MorseController {

    private final MorseEncoder encoder;
    private final MorseDecoder decoder;
    private final KeyStreamDecoder keyStream;
    private final MorseTiming timing;

    public MorseController(MorseEncoder encoder, MorseDecoder decoder,
                           KeyStreamDecoder keyStream, MorseTiming timing) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.keyStream = keyStream;
        this.timing = timing;
    }

    /** English -> Morse. */
    @PostMapping("/encode")
    public EncodeResponse encode(@RequestBody EncodeRequest request) {
        String text = request.text() == null ? "" : request.text();
        return new EncodeResponse(text, encoder.encode(text), encoder.unsupportedCharacters(text));
    }

    /** Morse -> English. */
    @PostMapping("/decode")
    public DecodeResponse decode(@RequestBody DecodeRequest request) {
        String morse = request.morse() == null ? "" : request.morse();
        return new DecodeResponse(morse, decoder.normalise(morse),
                decoder.decode(morse), decoder.isFullyValid(morse));
    }

    /** Raw instrument presses -> dots, dashes, letters, words. */
    @PostMapping("/key")
    public KeyReading key(@RequestBody KeyStreamRequest request) {
        List<KeyPress> presses = request.presses() == null ? List.of() : request.presses();
        return keyStream.read(presses, request.wpm(), request.trailingGapMs());
    }

    /** The exact rhythm for the instrument to tap a message back on its own. */
    @PostMapping("/playback")
    public PlaybackResponse playback(@RequestBody PlaybackRequest request) {
        int wpm = request.wpm() > 0 ? request.wpm() : 15;
        String morse = (request.morse() != null && !request.morse().isBlank())
                ? decoder.normalise(request.morse())
                : encoder.encode(request.text());
        List<Tone> timeline = timing.timeline(morse, wpm);
        return new PlaybackResponse(morse, wpm, KeyStreamDecoder.unitMsFor(wpm),
                timing.totalMs(timeline), timeline);
    }

    /** Reference chart + the timing constants the UI labels its meters with. */
    @GetMapping("/alphabet")
    public Map<String, Object> alphabet(@RequestParam(defaultValue = "15") int wpm) {
        int unit = KeyStreamDecoder.unitMsFor(wpm);
        return Map.of(
                "chart", MorseAlphabet.chart(),
                "wpm", wpm,
                "unitMs", unit,
                "dashThresholdMs", 2 * unit,
                "letterGapMs", 2 * unit,
                "wordGapMs", 5 * unit
        );
    }
}
