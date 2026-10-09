package com.yupi.springbootinit.config;

import com.yupi.springbootinit.bizmq.BiMqConstant;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declare the listener topology on the configured broker, including an empty local instance.
 */
@Configuration
public class BiMqConfig {

    @Bean
    public Declarables biMqTopology() {
        // Keep exchanges compatible with the original InitMain declarations.
        DirectExchange biExchange = new DirectExchange(BiMqConstant.BI_EXCHANGE_NAME, false, false);
        Queue biQueue = new Queue(BiMqConstant.BI_QUEUE_NAME, true);
        DirectExchange codeExchange = new DirectExchange("code_exchange", false, false);
        Queue codeQueue = new Queue("code_queue", true);
        return new Declarables(
                biExchange,
                biQueue,
                BindingBuilder.bind(biQueue).to(biExchange).with(BiMqConstant.BI_ROUTING_KEY),
                codeExchange,
                codeQueue,
                BindingBuilder.bind(codeQueue).to(codeExchange).with("my_routingKey"));
    }
}
