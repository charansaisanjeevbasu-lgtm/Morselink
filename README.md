# Morse Code Pro

A two-way Morse code converter with a working virtual telegraph bench.
Type English and get Morse, paste Morse and get English, or key a message
yourself on a brass straight key or a dual paddle and watch Java read it back.

**The whole Morse engine is Java.** The browser measures milliseconds and draws
things; it does not contain the Morse alphabet, the dot/dash rule, or the
letter-gap rule. Every symbol you see on screen is an answer from the server.
<img width="2881" height="1529" alt="Capture-2026-09-27-152120" src="https://github.com/user-attachments/assets/bcfb3b7a-ad5e-4f6f-8675-eb7b2d68dc63" />

<img width="2921" height="1610" alt="Capture-2026-09-27-152051" src="https://github.com/user-attachments/assets/c7144e64-09d5-4fbe-b619-c9b38b86fa9a" />

### Demo

A full walkthrough — keying by hand on the straight key, switching to the dual
paddle, and the instrument tapping a message back on its own.

<video src="demo_morse.mp4" controls muted width="820" poster="">
  <a href="demo_morse.mp4">Watch the demo (demo_morse.mp4)</a>
</video>

---

## Requirements

- Java 21 (verified on Amazon Corretto 21.0.6)
- Maven 3.9+

## Run it

```bash
mvn spring-boot:run
```

Then open <http://localhost:8080>.

To run the tests:

```bash
mvn test        # 11 tests covering encoding, decoding, key timing and playback
```

To build a self-contained jar:

```bash
mvn clean package
java -jar target/morse-code-pro-1.0.0.jar
```

---

## Using the bench

| What you do | What happens |
|---|---|
| Type in the **English** box | Java encodes it into the Morse box as you type |
| Paste into the **Morse** box | Java decodes it into English; the badge says whether every group is a real character |
| **Press and hold the key** | A short tap is a dot, a long hold is a dash — Java decides which, from the milliseconds |
| Pause | A pause past the letter gap ends the character; a longer one ends the word |
| **▶ Play on instrument** | The key taps your message back on its own, in exact rhythm, with tone and lamp |
| **Speed** slider | 5–30 wpm. Changes the dot length, and with it every threshold on the meters |
| **Tone** slider | 350–900 Hz sidetone |
| Alphabet chart | Click any character to hear and see it keyed |

Keyboard: **Space** works the straight key, **←** and **→** work the dot and dash paddles.

### The meters

- **HOLD** — fills while the key is down, with a mark at the dot/dash boundary
- **GAP** — fills after you release, with marks at the letter and word boundaries
- **Inker tape** — the last few seconds of your transmission, drawn like a telegraph register
- **Letter forming** — what your current dots and dashes would become if you stopped now

---

## How it is put together

```
src/main/java/com/morsepro/
├── MorseApplication.java        Spring Boot entry point
├── core/
│   ├── MorseAlphabet.java       the ITU table: letters, digits, punctuation
│   ├── MorseEncoder.java        English -> Morse
│   ├── MorseDecoder.java        Morse -> English, tolerant of pasted variants
│   ├── KeyStreamDecoder.java    raw press/gap milliseconds -> dots, letters, words
│   └── MorseTiming.java         builds the playback rhythm
├── model/                       request and response records
└── web/MorseController.java     the REST surface

src/main/resources/static/
├── index.html                   layout + both instruments as inline SVG
├── css/telegraph.css            brass, oak, glass, glow
└── js/
    ├── audio.js                 Web Audio sidetone with soft edges
    ├── api.js                   thin client over the Java endpoints
    ├── tape.js                  the inker tape canvas
    ├── instrument.js            press physics, spark, lamp, meters, playback
    └── app.js                   wiring and state
```

### Timing

Everything follows the ITU proportions, from one unit = `1200 / wpm` ms:

| Element | Units |
|---|---|
| dot | 1 |
| dash | 3 |
| gap inside a character | 1 |
| gap between characters | 3 |
| gap between words | 7 |

When reading a live operator, the decision boundaries sit between those values:
a press is a dash past **2 units**, a gap ends the letter past **2 units** and the
word past **5 units**. Leave the speed at 0 in an API call and Java infers the
dot length from the operator's own shortest press.

---

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/encode` | `{"text":"SOS"}` | the Morse, plus any characters Morse cannot carry |
| POST | `/api/decode` | `{"morse":"... --- ..."}` | the text, the normalised Morse, and whether it is fully valid |
| POST | `/api/key` | `{"wpm":15,"trailingGapMs":0,"presses":[{"durationMs":60,"gapBeforeMs":0}]}` | symbols, finished text, the letter in progress, and the current thresholds |
| POST | `/api/playback` | `{"text":"SOS","wpm":20}` | a tone-on/tone-off timeline in milliseconds |
| GET | `/api/alphabet?wpm=15` | — | the reference chart and the timing constants |

```bash
curl -s localhost:8080/api/encode \
  -H 'Content-Type: application/json' -d '{"text":"Hello World"}'
# {"text":"Hello World","morse":".... . .-.. .-.. --- / .-- --- .-. .-.. -..","unsupported":""}
```

`/api/key` is stateless: the browser sends every press it has recorded so far and
Java rebuilds the whole reading each time, so the page and the server can never
drift apart.

---

## Note while developing

`spring-boot:run` serves the static files from `target/classes`, not from
`src/main/resources`. After editing HTML, CSS or JS, copy them across and
refresh:

```bash
mvn resources:resources
```

Java changes need a restart of `spring-boot:run`.
