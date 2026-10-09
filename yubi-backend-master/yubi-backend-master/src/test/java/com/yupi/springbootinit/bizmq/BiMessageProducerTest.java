package com.yupi.springbootinit.bizmq;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class BiMessageProducerTest {
    @Test
    void taskMessageIsPersistentWithoutChangingItsPayloadOrRouting() {
        RabbitTemplate rabbit = mock(RabbitTemplate.class);
        BiMessageProducer producer = new BiMessageProducer();
        ReflectionTestUtils.setField(producer, "rabbitTemplate", rabbit);

        producer.sendMessage("42");

        ArgumentCaptor<MessagePostProcessor> processor = ArgumentCaptor.forClass(MessagePostProcessor.class);
        verify(rabbit).convertAndSend(eq(BiMqConstant.BI_EXCHANGE_NAME), eq(BiMqConstant.BI_ROUTING_KEY),
                eq("42"), processor.capture());
        MessageProperties properties = new MessageProperties();
        properties.setDeliveryMode(MessageDeliveryMode.NON_PERSISTENT);
        properties.setContentType(MessageProperties.CONTENT_TYPE_TEXT_PLAIN);
        Message message = new Message("42".getBytes(StandardCharsets.UTF_8), properties);
        Message published = processor.getValue().postProcessMessage(message);

        assertEquals(MessageDeliveryMode.PERSISTENT, published.getMessageProperties().getDeliveryMode());
        assertArrayEquals(message.getBody(), published.getBody());
        assertEquals(MessageProperties.CONTENT_TYPE_TEXT_PLAIN, published.getMessageProperties().getContentType());
        verifyNoMoreInteractions(rabbit);
    }
}
