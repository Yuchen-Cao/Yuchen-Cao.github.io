---
title: SWE to workspace to physical workspace agent
date: 2026-08-28
description: 从 CaP-X、MHS 与具身 Agent 的交互边界出发，讨论 SWE agent 的工作方式如何走向动态、异步且不可逆的物理世界。
tags: Agents, Embodied Intelligence, Physical AI
featured: true
---

# SWE to workspace to physical workspace agent

从 CaP-X 出发想到。

第一次见到 Cap X 的思路，觉得并不意外，但又和我直觉里 coding-agent harness is the control loop 的 SWE agent 交互范式不太能类比：它还是用 code 写了更底层的 action 表示——用 LLM 写 code 作为 policy，而非仿照 SWE coding agent 思路，利用 LLM 的多轮 tool call 能力解决问题。

我预期的模式是，模型在仿真环境就像在代码世界的仓库环境里一样，inspect → act → observe → verify → revise，以及把验证过的行为自发沉淀为 skills。

## 为什么 CaP-X 在 LIBERO 上表现不理想

Anthropic 7 月发了一篇[博客](https://www.anthropic.com/research/claude-plays-robotics)，对比了几种交互模式。即使使用最先进的模型，直接去做 manipulation 的端到端成功率依然只有 5.5% 之低；如果使用 VLA MolmoAct 给到 LLM，让 LLM 去控制和覆盖它的 action，虽然比直接通过 LLM manipulate 要好，但是还不如 MolmoAct 跑——问题就在于 LLM 会在不该插手时候乱干扰，我们把它姑且称为一种 system-2 税。

> system-2 intervention is not free.

我们自己测试 CaP-X 的时候，使用 GPT 5.6，它反复 thinking 修改得会比更早版本的 GPT 5.2 更多，在每一个动作消耗更多的时间。而这会导致更多的超时失败。——LLM 的 Test time computing 会让它获得更多潜在的能力，但 Agentic 任务中基于了 POMDP 假设，state 在这个过程中不能演化；而物理世界是会随着时间变化而演化的，等不及 LLM 用无穷的 thinking budget 慢慢想。

在传统、高频交互的机器人模型中，高频交互的假设可以将环境 state 近似为不变，但如果 LLM decoding 的 thinking 的耗时很长，就不能继续遵从这个假设。turn based 的交互模式似乎并不太适合应对物理世界的时间流逝，所以 thinking machine lab 之前提出了 interactive model 的范式，切了 200ms 的 chunk 以近似“实时”。我感觉它的短板也很明显：200ms 的 chunk 对 LLM 来说，冗余的上下文太多，对模型上下文以及硬件的压力都很大，这是我们为什么在尝试[设计新的交互](https://arxiv.org/pdf/2605.11484)、训练非 turn based 的时间感知模型。

进一步来讲，除了时间的自然演化，从环境的不可恢复来看，数字世界要解决的问题和物理世界相比，也显得小巫见大巫。

SWE 里面：patch 错了 → git diff → test → 再 patch。

physical world 里面：grasp 错了 → object 已经被碰歪；retry → object 又移动；retry → 更差；重新估 pose → environment 已经不是最初那个 environment。

对此，Anthropic 在 [MHS](https://www.anthropic.com/news/model-hardware-standard-research-preview) 的 Genetech case 里就给了这样的例子：液体出现气泡后，Claude 的第一反应就是换参数 retry；结果越 retry，液体被搅得越厉害，气泡更多。直到人告诉它这不是数字环境的 bug，而是物理世界，它才换适合物理世界的方案，然后把经验写进可复用的 skill 中。

所以回去思考对比 CaP-X 与 [Embodied Agents Take Control](https://arxiv.org/pdf/2607.26148)，前者似乎还是通过代码能力，把手伸向更底层的 code as policy，而后者更符合我们做 coding agent 的直觉：由 LLM 掌握工具的调用，判断什么时候调用什么能力、什么时候应该重新看、什么时候 evidence 足够、什么时候 interrupt、什么时候改变计划。所以比起 CaP-X，我对 [Guava](https://arxiv.org/pdf/2606.18363)、[Thea](https://arxiv.org/pdf/2509.18597) 这些更感兴趣。

## MHS 没有坚持 code as policy 的道路

此前，我们也都觉得把 VLA 等作为工具给 LLM，利用它在 SWE 以及 workspace 上体现出的 agentic 能力，一定可以解决环境演化本身较少的物理世界任务——还能做到比现有的“大脑”更长程，更通用。但这个与工具之间的交互边界标准很难定义。

MHS 就像是这个交互咬合的一种尝试。把各种设备统一成 driver，每个设备都可以暴露状态等，并给 agent 提供控制入口——就有点像把 Claude Code 去面对设计好的数字世界 workspace。

而在具体的途径中，它并没有坚持 code as policy。code 的角色从每次行动都写代码，变成“经过 reasoning 得到一个好的 procedure，把它凝练成可复用的 skill”。

这样来看，SWE 到 workspace 再到这个路线的物理世界，就成为了自然的过渡。

SWE agent 在完美的 agentic world 里成长，而 MHS 则是把它扩展到了物理世界。

从 MCP 到 MHS，是一次对世界的扩容，原本在数字世界中活跃的 MCP，到了现在变成了在物理世界访问状态的 MHS，agent 的边界从数字世界的文件、数据等扩展到机械臂、相机、传感器、无人机等更广阔的世界。

换句话说，我们不用额外新造一个巨大的模型，把真实世界压进这个权重，而是可以把它包装、改造成 LLM 友好的、agent 可操作的 workspace，变成一个更符合数字世界交互逻辑的接口。

## SWE 里的 repo，本身也是世界状态

此前，和朋友讨论 world model 的含义。我开玩笑说 LLM，尤其是 SWE 场合的 agentic LLM，怎么不是一种世界模型呢？既然视频模型可以作为世界模型，那么预测代码运行后的状态的模型，未尝不是世界模型啊。

[Code as worlds](https://mirros-lab.github.io/code-as-world/) 让我也觉得很有趣：code 不仅仅可以描述 action，也可以描述世界本身。

[Code as Agent Harness](https://arxiv.org/pdf/2605.18747) 则直接把 code 的作用分为：reasoning，acting 和 environment modeling。

所以或许顺着时间发展，Agent 的演进是这样的：

```text
阶段                       Agent 的“世界”                         核心能力
Chat                       conversation                           reasoning
Coding                     repository + terminal                 reasoning + execution
SWE                        repo + tests + long trajectory         execution + verification + repair
Workspace                  files + browser + apps + compute       heterogeneous orchestration
Scientific workspace       data + models + HPC + artifacts        long workflow + reusable skills
Physical workspace         sensors + devices + policies +         world interaction
                           actuators
Persistent physical agent  dynamic world + concurrent processes   continuous existence
```

## fill the gap 依然困难

此前也有提到，比起 SWE 的数字场景，物理世界有多重困难：

1. 时间演变
2. 不可逆
3. 局部可见性更严重

这对模型能够通过多种渠道更新自己内部隐含 belief 的要求变得更高。

## 更长程、更通用——才是我的菜

我们在物理世界，需要真实 horizon 更长的 agent。

LIBERO 这种 pick and place 实际上太短了，在人类的实践中，我们甚至意识不到自己过脑子。

而 LLM 的定位更像是真实的思考、有意识地动脑子的部分，它不该是 LLM 频繁参与的地方。如果我们学习 Anthropic 一样，选择自动化实验室的 case，则需要关注数小时甚至天级的轨迹、跨设备和并行任务。这样的任务有效 agentic horizon 更长，天然更适合 LLM 发挥。

> The physical world will increasingly become an agent workspace.

如果要造一个指引优化方向的 Benchmark，它或许该是一个物理世界的 workspace agent bench：小时级、异步，多 skill，多设备、任务途中变化，需要长期 belief 和恢复能力……以利用上 SWE 为模型锻炼出的能力——也是人类更期待活跃在物理世界的具身 agent 能达成的。

——毕竟大家看够了舞蹈和杂技，都期待一个有脑子的机器人。
