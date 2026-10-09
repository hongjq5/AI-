package com.yupi.springbootinit.config;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.*;

class BiMqConfigTest {
    @Test
    void springDeclaresBothListenerTopologiesWithLegacyCompatibleProperties() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(BiMqConfig.class)) {
            Collection<Declarables> groups = context.getBeansOfType(Declarables.class).values();
            assertEquals(1, groups.size());
            Declarables declarations = groups.iterator().next();
            assertEquals(6, declarations.getDeclarables().size());
            assertTopology(declarations, "bi_exchange", "bi_queue", "bi_routingKey");
            assertTopology(declarations, "code_exchange", "code_queue", "my_routingKey");
        }
    }

    private void assertTopology(Declarables declarations, String exchangeName, String queueName, String key) {
        DirectExchange exchange = declarations.getDeclarablesByType(DirectExchange.class).stream()
                .filter(item -> exchangeName.equals(item.getName())).findFirst().orElseThrow(AssertionError::new);
        assertFalse(exchange.isDurable(), "must match existing InitMain exchange declaration");
        assertFalse(exchange.isAutoDelete());
        Queue queue = declarations.getDeclarablesByType(Queue.class).stream()
                .filter(item -> queueName.equals(item.getName())).findFirst().orElseThrow(AssertionError::new);
        assertTrue(queue.isDurable());
        assertFalse(queue.isExclusive());
        assertFalse(queue.isAutoDelete());
        assertTrue(declarations.getDeclarablesByType(Binding.class).stream().anyMatch(binding ->
                exchangeName.equals(binding.getExchange()) && queueName.equals(binding.getDestination())
                        && key.equals(binding.getRoutingKey()) && binding.isDestinationQueue()));
    }
}
