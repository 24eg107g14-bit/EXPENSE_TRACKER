package com.expensetracker.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final long hours;

    public TokenService(JwtEncoder encoder, @Value("${app.jwt.hours:12}") long hours) {
        this.encoder = encoder;
        this.hours = hours;
    }

    /** Issues a signed token whose subject is the user's email. */
    public String issue(String email) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(email).issuedAt(now).expiresAt(now.plus(hours, ChronoUnit.HOURS)).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
