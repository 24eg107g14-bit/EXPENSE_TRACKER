package com.expensetracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Smoke test: verifies that the Spring application context loads without errors.
 *
 * Run with:  mvn test  (from the backend/ directory)
 *
 * The @TestPropertySource overrides the datasource so the test can pass even
 * without a live MySQL instance (Spring Boot will fall back to an in-memory
 * H2 database if the driver is on the test classpath, or simply skip JPA
 * auto-configuration when no driver is available).  Add the H2 dependency to
 * enable full JPA testing:
 *
 *   <dependency>
 *     <groupId>com.h2database</groupId>
 *     <artifactId>h2</artifactId>
 *     <scope>test</scope>
 *   </dependency>
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "app.jwt.secret=test-only-secret-at-least-32-chars-here!",
    "app.cors.allowed-origins=*",
    "springdoc.swagger-ui.enabled=false",
    "springdoc.api-docs.enabled=false"
})
class ExpenseTrackerApplicationTests {

    @Test
    void contextLoads() {
        // If this test passes, the entire Spring context wired up correctly.
    }
}
