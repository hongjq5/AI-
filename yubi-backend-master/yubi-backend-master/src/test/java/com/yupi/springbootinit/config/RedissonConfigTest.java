package com.yupi.springbootinit.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.redisson.config.Config;

import static org.junit.jupiter.api.Assertions.*;

class RedissonConfigTest {
    private Config build(String password) {
        RedissonConfig configuration = new RedissonConfig();
        configuration.setHost("127.0.0.1");
        configuration.setPort(16379);
        configuration.setDatabase(2);
        configuration.setPassword(password);
        return configuration.buildConfig();
    }

    @Test
    void authenticatedRedisReceivesConfiguredPasswordAndConnection() {
        Config config = build("test-only-password");
        assertEquals("test-only-password", config.useSingleServer().getPassword());
        assertEquals("redis://127.0.0.1:16379", config.useSingleServer().getAddress());
        assertEquals(2, config.useSingleServer().getDatabase());
    }

    @ParameterizedTest
    @NullAndEmptySource
    void unauthenticatedRedisDoesNotSendPassword(String password) {
        assertNull(build(password).useSingleServer().getPassword());
    }
}
