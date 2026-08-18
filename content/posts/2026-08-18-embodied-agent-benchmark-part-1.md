---
title: 具身智能领域需要自己的 北极星 Bench（上）
date: 2026-08-18
description: 从 Coding Agentic LLM 视角讨论具身 agent 的 interaction loop，以及 code、VLA 与 tool ecosystem 的关系。
tags: Agents, Embodied Intelligence, Benchmarks
featured: true
---

# 具身智能领域需要自己的 北极星 Bench（上）

> “作为 LLM 切入具身大脑研发的人员，我们在想些什么”系列之一

### 写在 CaP-X 被广泛关注后

作为从 Coding Agentic LLM 视角切入具身智能领域的从业者，第一次看到 [CaP-X](https://arxiv.org/abs/2603.22435) 时，我并没有觉得它提出了一个特别陌生的范式。我们早已习惯 coding agent 和 agentic RL，这类 Code-as-Policy 工作的核心逻辑非常熟悉：

感知，思考，行动，读取环境反馈（下一轮感知），更新对环境的认知（下一轮思考），再决定下一步行动；失败不是 episode 的终点，而是下一轮推理的输入。

与自动驾驶切入——默认物理世界试错成本更高，于是倾向于审慎地提供足够多信息后再行动、保证一次成功率——的做法不同，数字世界，或者说代码环境的 testbed 试错成本很低，天然 favor 这种试错更新 belief，从而在 context 内变得对环境更熟稔的交互范式。

而 CaP-X 做的事情，在抽象层面上并没有脱离 agentic coding 这条路径：模型生成 Python 程序，调用感知和控制原语，执行程序，读取结构化反馈，再通过多轮交互、视觉差分、技能合成和重试提升成功率。CaP-X 的贡献并不是发明了 agent loop，而是把现代 coding agent 的工作方式搬进了机器人控制，并系统研究了 abstraction、interaction 和 perceptual grounding 对性能的影响。

不得不说这种搬运非常有价值——尽管习惯了 SWE 场景 agentic loop 的大模型从业者会天然诞生具身领域也可以用这一套的想法，但是一个范式在软件环境中成立，并不意味着它自然就能在物理世界中成立。我们能想到的第一个问题就是，交互层到底在哪里？

具身 agent 的本质究竟是让模型写出一段更长的控制代码，还是让模型真正掌握与环境交互的循环？

我的直觉是后者。

### Agentic 的关键不是多次调用，而是 interaction loop 由谁掌握

很多具身系统很早便积极融合进了大模型 Agent 的能力，这类工作的流程大致是：

![预定义 workflow 中的大模型调用流程](/assets/posts/polaris-bench/predefined-workflow.png)

早期的这类系统显然会多次调用大模型，但重新观察、更新记忆、触发 replan、失败后走哪条 recovery path 还是人为写好的规则；大模型在其中只是一个 planner component。

当我们谈论 agentic coding 的时候，会默认这些工具检索、修改或测试的调用是由大模型自主发起的。如果把 agentic 系统写成通用一些的流程：

![由 Agent 掌握的 interaction loop](/assets/posts/polaris-bench/agentic-interaction-loop.png)

$$
b_{t+1}=\operatorname{Update}(b_t,o_{t+1},a_t,f_{t+1})
$$

$$
u_{t+1}=\operatorname{Agent}(g,b_{t+1},T)
$$

这里的 $b_t$ 并不一定是严格的贝叶斯 belief，而是模型在工作意义上对环境的当前认知；$T$ 是模型可以选择的工具集合；$f_t$ 则是动作执行后得到的反馈。

近期，具身研究也日渐明确到这个路线上。[AgenticNav](https://arxiv.org/abs/2606.10577) 把 action、depth 和 memory 暴露成由 VLM 按需调用的工具；[Embodied Agents Take Control](https://arxiv.org/abs/2607.26148) 则直接把 SWE 领域熟悉的 mini swe agent harness 接入导航环境，让模型自主决定何时观察、怎样移动以及何时停止。

可见，当前人们已经开始探索如何把 interaction loop 交给模型。

### Code 可以是工具，但不应该成为一切的核心

回到对 CaP-X 的讨论。CaP-X 生成的程序会调用 SAM3、Molmo、OpenCV、Open3D、IK、运动规划和碰撞检测等感知与控制原语，它实际上已经集成了相当多的 tools。

可是，与我们把数字世界的 SWE 迁移到物理世界的直觉相悖，它把 python program 放在了过于中心的位置，默认把代码作为机器人高层行为的主要控制平面。在 CaP-X 中，一个 code-environment turn 对应一次模型调用：模型生成 Python program，环境随后把这段程序执行到结束；程序内部可以连续调用多个感知和控制原语，程序执行结束后，模型才重新获得控制权。

但物理世界并不总像执行一段 shell script。

插入、倾倒、擦拭、开门、拥挤环境导航等任务，都可能需要连续视觉反馈、接触反馈、外部事件和安全中断。在一个固定的状态下，得到的反馈不一定如 code 一般完全可复现、无噪声。而一个动作在开始时合理，并不意味着它在三秒后仍然应该继续执行。

如果参考 SWE 类型的 Agent 设计的思路，物理世界的 Embodied Agent 更可能是类似于：

```text
Generalist Embodied Agent
 │
 ├── observe / visual query / object grounding
 ├── depth / geometry / 3D reconstruction
 ├── map / scene graph / episodic memory
 ├── navigation stack
 ├── VLA manipulation policies
 ├── WAM / simulator / consequence prediction
 ├── code execution / numerical computation
 ├── evaluator / verifier
 └── ask user / wait / cancel / stop
```

代码依然是重要的工具，但它属于一个 tool 本身，可以在预定义的 tool / skill 不能适配的情况下临时合成新 skill、生成局部 controller 等 —— 起到增强扩展性的作用；它不应该默认替代 VLA、WAM、导航系统和专门的低层 controller。

近期一些 VLA-as-Tools 已经沿着这个方向推进：高层 VLM 负责场景分析、全局规划和失败恢复，多个 specialized VLA 则作为有明确边界的工具执行局部物理任务。作为 tool 的 VLA 在执行过程中向上层提供 progress feedback，使 agent 可以根据事件重新规划，而不是持续高频轮询。

我们对上层模型都非常有信心 —— 它朝着 AGI 的方向大步流星地迈进，仿佛明天就挑战菲尔兹奖。但在这个设计方案里，除了要加强上层模型对物理世界的认知能力，我们还需要训练下层模型作为一个可靠的工具被调用的能力。

![上层 LLM 能力与具身智能基础认知能力的反差](/assets/posts/polaris-bench/llm-fields-medal-vs-embodied-reality.png)

一个 VLA tool 需要明确知道：调用指令的边界是什么；什么情况下应该开始；什么情况下应该结束；什么时候应该报告失败；中间进度如何反馈；被打断后如何安全退出，等等。

与此前大家喜欢把 VLA 描述成 agentic LLM 的竞争者不同，我直觉上类比它是未来 embodied agent tool ecosystem 中非常关键的一类执行器 —— 且二者需要被协同训练。
