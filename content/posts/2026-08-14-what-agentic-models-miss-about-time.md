---
title: What Agentic Models Still Miss About Time
date: 2026-08-14
lang: en
description: Token order is not elapsed time. Real agents need a representation of time that survives pauses, tools, and asynchronous events.
tags: Agents, Temporal Reasoning, Post-training
featured: true
---

# What Agentic Models Still Miss About Time

Language models are exceptionally good at sequences, but sequence position is not the same thing as time.

A thousand tokens can be generated in a few seconds or spread across several minutes. An environment can remain unchanged while the model reasons, then change abruptly between two adjacent tokens. Once an agent interacts with tools, sensors, or people, the familiar token index becomes a poor clock.

That mismatch is easy to hide in benchmarks. Most agent evaluations serialize the world into a loop:

1. provide an observation;
2. let the model finish a turn;
3. execute an action;
4. return the next observation.

The loop is convenient, but it quietly assumes that nothing important happens while the model is thinking. In a real system, that assumption is often false.

## Three notions of time

It helps to separate three quantities that are usually collapsed:

- **token position** — where a token appears in the model sequence;
- **interaction step** — which observation–action cycle the agent is in;
- **wall-clock time** — when an event actually occurred.

They are correlated in simple tasks and sharply different in live environments. A useful temporal representation should preserve those differences rather than forcing the harness to translate all timing into prose.

## Why timestamps in text are not enough

The simplest solution is to append text such as `[12.4 seconds elapsed]` to every observation. This is a valuable baseline: it requires no architectural change and uses capabilities the model already has.

But text timestamps also have costs. They consume context, entangle time with formatting, and only appear when the runtime decides to emit a token. More importantly, they turn a continuous property of the interaction into an occasional linguistic hint.

An explicit temporal channel offers a different inductive bias. Tokens can retain their ordinary positional encoding while receiving additional metadata about event time, source, or validity. The model can then reason over both sequence order and elapsed time without treating them as interchangeable.

## The training problem is behavioral

Adding a clock does not automatically produce temporal competence. The model still needs experience that makes time decision-relevant.

Consider a task where an answer is correct only inside a target window. If the model answers too early, a scalar success reward says that the trajectory failed, but not whether it should have waited, checked the clock, or reasoned faster. Sparse reward makes the exploration problem particularly severe when the model has never learned a useful waiting behavior.

This suggests a curriculum:

1. establish valid temporal actions with demonstrations or constrained rollouts;
2. train on dense distinctions such as early, on-time, and late;
3. gradually widen the action space and reduce scaffolding;
4. evaluate under variable decoding speed and environment latency.

The key test is not whether a model can read a timestamp. It is whether the learned policy remains calibrated when token count, compute time, and event time are deliberately decorrelated.

## Beyond a better clock

Time awareness eventually changes the interaction protocol itself. A model that can represent time but can only receive observations between completed turns is still unable to react during a long deliberation.

The deeper direction is therefore event-driven: observations arrive when the world changes, safety-critical signals can interrupt ongoing reasoning, and the agent maintains a belief state across events with different temporal scales.

The clock is not the whole solution. It is the first piece of infrastructure that makes the missing problem visible.
