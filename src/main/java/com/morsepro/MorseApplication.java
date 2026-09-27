package com.morsepro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MorseApplication {

    public static void main(String[] args) {
        SpringApplication.run(MorseApplication.class, args);
        System.out.println("""

                  Morse Code Pro is running.
                  Open  ->  http://localhost:8080
                """);
    }
}
