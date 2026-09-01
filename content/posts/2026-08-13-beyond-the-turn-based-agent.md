---
title: Beyond the Turn-Based Agent
date: 2026-08-13
lang: en
translationKey: beyond-the-turn-based-agent
description: Harness design matters, but asynchronous interaction exposes problems that cannot always be solved outside the model.
tags: Agents, Embodied Intelligence, Systems
featured: false
---

# Beyond the Turn-Based Agent

The standard agent harness has been remarkably productive. It gives a language model tools, records their outputs, and repeats until a task is complete. For coding and web tasks, this abstraction is often exactly right.

It becomes less comfortable when the environment has its own tempo.

A robot, voice interface, or collaborative agent cannot always wait for the model to finish a long turn. Sensor state changes during inference. People interrupt. Some events expire if they are not handled quickly. The environment is not a function that politely returns after each model action.

## What the harness can solve

A strong runtime should handle a great deal:

- scheduling tools and managing concurrency;
- filtering noisy observations;
- enforcing hard safety constraints;
- caching stable state and routing urgent events;
- controlling budgets and recovering from failures.

These are systems responsibilities. Moving them into model weights would make the system harder to verify and less efficient.

## Where the model becomes involved

The boundary changes when the agent must interpret an interruption in the context of unfinished reasoning.

Suppose a model is planning a multi-step manipulation and a new observation invalidates an early assumption. A runtime can stop generation and append the event, but the model must still decide which beliefs remain valid, which part of the plan should be revised, and whether the event is relevant at all.

This is more than message routing. It is state revision under asynchronous evidence.

## From turns to events

An event-driven agent can be described with four model-facing primitives:

1. **observation events** carrying source and time metadata;
2. **belief updates** that make state revision explicit;
3. **actions** addressed to tools, controllers, or people;
4. **yield policies** that say when to wait, resume, or request another observation.

The representation does not need to mimic human cognition. It only needs to preserve the causal and temporal distinctions required by the downstream policy.

## A useful research split

The most productive question is not “model or harness?” in the abstract. It is: which failures remain after the runtime has provided clean events, reliable clocks, and enforceable constraints?

If the remaining failure is scheduling, fix the runtime. If it is belief revision, temporal credit assignment, or deciding when incomplete reasoning is already sufficient to act, model-side learning may be necessary.

That split turns a philosophical argument into an experimental program.
