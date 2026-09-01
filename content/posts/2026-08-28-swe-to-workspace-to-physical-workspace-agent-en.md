---
title: From SWE Agents to Workspace Agents—and Into the Physical World
date: 2026-08-28
lang: en
translationKey: swe-to-workspace-to-physical-workspace-agent
description: Starting from CaP-X and MHS, I explore how the working style of SWE agents might extend into a physical world that is dynamic, asynchronous, and irreversible.
tags: Agents, Embodied Intelligence, Physical AI
featured: true
---

# From SWE Agents to Workspace Agents—and Into the Physical World

Some thoughts prompted by CaP-X.

When I first encountered the idea behind CaP-X, it did not strike me as surprising. Yet it was also hard to map onto my intuition from SWE agents, where the coding-agent harness *is* the control loop. CaP-X still uses code to express lower-level actions: the LLM writes code as a policy, rather than solving the task through repeated tool calls in the style of an SWE coding agent.

What I had expected was a model that behaves in a simulated environment the way it does in a code repository: inspect → act → observe → verify → revise—and that spontaneously turns verified behaviors into reusable skills.

## Why CaP-X struggles on LIBERO

In July, Anthropic published a [blog post](https://www.anthropic.com/research/claude-plays-robotics) comparing several interaction modes. Even with a frontier model, direct end-to-end manipulation succeeded only 5.5% of the time. Giving the LLM access to the MolmoAct VLA and allowing it to steer or override its actions did better than direct LLM manipulation, but still worse than simply letting MolmoAct run. The LLM kept interfering when it should have stayed out of the way. For now, let us call this a system-2 tax.

> System-2 intervention is not free.

In our own CaP-X tests, GPT-5.6 repeatedly reconsidered and revised its plans more than the earlier GPT-5.2, spending longer on every action. That extra deliberation also caused more timeouts. Test-time compute can unlock more potential capability, but agentic tasks are often formulated under a POMDP assumption in which the state does not change while the model thinks. The physical world does change. It will not wait patiently while an LLM consumes an unlimited thinking budget.

High-frequency robotic policies can reasonably approximate the environment state as fixed between interactions. Once LLM decoding and deliberation take significant time, that approximation stops holding. Turn-based interaction therefore seems poorly suited to a physical world in continuous motion. This is why Thinking Machines Lab proposed an interactive-model paradigm based on 200 ms chunks, approximating real-time interaction. Its downside also seems obvious to me: for an LLM, 200 ms chunks introduce a great deal of redundant context and put heavy pressure on both context length and hardware. That is why we have been exploring [a different interaction design](https://arxiv.org/pdf/2605.11484) and training time-aware models that are not turn-based.

Time is only the beginning. The gap between digital and physical environments becomes even larger once we consider reversibility.

In SWE:

> Bad patch → inspect `git diff` → run tests → patch again.

In the physical world:

> Bad grasp → the object has already shifted; retry → the object moves again; retry → things get worse; estimate the pose again → this is no longer the environment you started with.

Anthropic described exactly this kind of failure in the Genentech case from its [MHS research preview](https://www.anthropic.com/news/model-hardware-standard-research-preview). When bubbles appeared in a liquid, Claude's first instinct was to change a parameter and retry. Every retry stirred the liquid further and created more bubbles. Only after a person reminded it that this was the physical world—not a bug in a digital environment—did it switch to a physically appropriate approach, then save that experience as a reusable skill.

This is why, when I compare CaP-X with [Embodied Agents Take Control](https://arxiv.org/pdf/2607.26148), the former still feels like code reaching downward into a lower-level Code-as-Policy layer. The latter is much closer to the intuition we developed from coding agents: the LLM owns tool use. It decides which capability to invoke, when to look again, when the evidence is sufficient, when to interrupt, and when to revise the plan. That is also why I find systems such as [Guava](https://arxiv.org/pdf/2606.18363) and [Thea](https://arxiv.org/pdf/2509.18597) more compelling than CaP-X.

## MHS does not insist on Code as Policy

We have long suspected that if VLAs and other physical capabilities were exposed to an LLM as tools, the agentic competence it developed in SWE and workspace settings could solve physical tasks in environments that do not evolve too quickly—while being more general and operating over a much longer horizon than existing robotic “brains.” The hard part is defining the interaction boundary between the model and those tools.

MHS looks like one attempt to make that boundary fit. It turns different devices into standardized drivers, each able to expose state and provide the agent with a control surface. In spirit, it is a little like handing Claude Code a carefully designed workspace in the digital world.

Crucially, it does not insist on Code as Policy. Code shifts from something written for every action to something distilled after reasoning: a good procedure becomes a reusable skill.

Seen this way, the progression from SWE to workspace agents and then to physical-world agents feels natural.

SWE agents grew up in an almost perfect agentic world. MHS extends that world into the physical one.

The move from MCP to MHS is an expansion of the world itself. MCP, which originally connected agents to the digital world, becomes MHS for accessing physical state. The agent's reach expands from files and data to robot arms, cameras, sensors, drones, and much more.

In other words, we may not need to build one enormous new model with the entire physical world compressed into its weights. We can package and reshape the world into an LLM-friendly, agent-operable workspace—an interface whose logic resembles the digital environments these models already know how to navigate.

## In SWE, the repository is already world state

I once joked with friends while discussing world models: why shouldn't an LLM—especially an agentic LLM working on SWE—count as a kind of world model? If a video model can be a world model, then surely a model that predicts how a codebase will change after execution has at least some claim to the name.

[Code as Worlds](https://mirros-lab.github.io/code-as-world/) pushes in a direction I find fascinating: code can describe not only actions, but the world itself.

[Code as Agent Harness](https://arxiv.org/pdf/2605.18747) divides the role of code into three parts: reasoning, acting, and environment modeling.

Following that line, perhaps the evolution of agents looks something like this:

```text
Stage                      The agent's “world”                       Core capabilities
Chat                       conversation                              reasoning
Coding                     repository + terminal                    reasoning + execution
SWE                        repo + tests + long trajectory            execution + verification + repair
Workspace                  files + browser + apps + compute          heterogeneous orchestration
Scientific workspace       data + models + HPC + artifacts           long workflows + reusable skills
Physical workspace         sensors + devices + policies + actuators  world interaction
Persistent physical agent  dynamic world + concurrent processes      continuous existence
```

## The gap is still hard to close

As I have argued before, the physical world adds several layers of difficulty beyond the digital setting of SWE:

1. time keeps moving;
2. actions can be irreversible;
3. observability is much more partial.

Together, these place much greater demands on the model's ability to update an implicit internal belief through multiple channels.

## Longer-horizon and more general—that is what I want

What we need in the physical world are agents with a genuinely longer horizon.

LIBERO-style pick-and-place tasks are simply too short. In everyday life, a human barely notices having to think about them.

An LLM is better cast as the part that genuinely reflects—the part that consciously spends cognitive effort. It should not need to jump in at high frequency. If, like Anthropic, we choose automated laboratories as the target setting, then the relevant trajectories last hours or even days, span multiple devices and parallel tasks, and have a much longer effective agentic horizon. That is exactly where an LLM is more likely to earn its keep.

> The physical world will increasingly become an agent workspace.

If we want a benchmark that points research in the right direction, perhaps it should be a physical-world workspace-agent benchmark: hour-scale and asynchronous, involving multiple skills and devices, changing conditions mid-task, and requiring persistent belief and recovery. Such a benchmark would finally make use of the abilities SWE has trained into these models—and it is also closer to what people actually hope embodied agents will accomplish in the physical world.

After all, we have seen enough dancing and acrobatics. What people are waiting for is a robot with a brain.
