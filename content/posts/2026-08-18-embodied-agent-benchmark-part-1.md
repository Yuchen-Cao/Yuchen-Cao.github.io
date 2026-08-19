---
title: 具身智能领域需要自己的 SWE-Bench
date: 2026-08-18
description: 从 Coding Agentic LLM 视角讨论 interaction loop、harness、长程依赖，以及具身智能为何需要自己的 SWE-Bench。
tags: Agents, Embodied Intelligence, Benchmarks
featured: true
---

# 具身智能领域需要自己的 SWE-Bench

> “LLM 切入具身大脑研发的人员的思考”

作为一名阴差阳错从 Coding LLM 切入具身行业的研发人员，这一年来感受到了具身系统的复杂，各个层次模型交织咬合在一起；也感受到自己不算在做大家通常聊天里的“具身智能”——真的和更多人理解的具身专家对话的时候，我们大模型边缘人感受到了巨大的 gap。这种感觉难以言说，于是得空就来写写这段时间以来的一些个人思考。

### 在 CaP-X 被广泛关注后

作为从 Coding Agentic LLM 视角切入具身智能领域的从业者，第一次看到 [CaP-X](https://arxiv.org/abs/2603.22435) 时，我并没有觉得它提出了一个特别陌生的范式。我们早已习惯 coding agent 和 agentic RL，这类 Code-as-Policy 工作的核心逻辑非常熟悉：

感知，思考，行动，读取环境反馈（下一轮感知），更新对环境的认知（下一轮思考），再决定下一步行动；失败不是 episode 的终点，而是下一轮推理的输入。

与自动驾驶切入——默认物理世界试错成本更高，于是倾向于审慎地提供足够多信息后再行动、保证一次成功率——的做法不同，数字世界，或者说代码环境的 testbed 试错成本很低，天然 favor 这种试错更新 belief，从而在 context 内变得对环境更熟稔的交互范式。

而 CaP-X 做的事情，在抽象层面上并没有脱离 agentic coding 这条路径：模型生成 Python 程序，调用感知和控制原语，执行程序，读取结构化反馈，再通过多轮交互、视觉差分、技能合成和重试提升成功率。CaP-X 的贡献并不是发明了 agent loop，而是把现代 coding agent 的工作方式搬进了机器人控制，并系统研究了 abstraction、interaction 和 perceptual grounding 对性能的影响。

还是不得不承认这种搬运非常有价值——就算习惯了 SWE 场景 agentic loop 的大模型从业者会天然诞生具身领域也可以用这一套的想法，但一个范式在软件环境中成立，并不意味着它自然就能在物理世界中成立。我们习以为常 SWE 任务的交互，多种 coding harness 的设计万变不离其宗，那么把数字世界 Agent 的思路迁移到物理世界，中间的咬合具体要围绕什么宗旨设计呢？

其中一个基础的，具身 agent 的本质究竟是让模型写出一段更长的控制代码，还是让模型真正掌握与环境交互的循环呢？

我直觉上比较倾向于后者。

### Agentic 的关键不是多次调用，而是 interaction loop 由谁掌握

很多具身系统很早便积极融合进了大模型 Agent 的能力，这类工作的流程大致是：

![预定义 workflow 中的大模型调用流程](/assets/posts/polaris-bench/predefined-workflow.png)

早期的这类系统显然会多次调用大模型，但重新观察、更新记忆、触发 replan、失败后走哪条 recovery path 还是人为写好的规则；大模型在其中只是一个朝着“一把梭”成功努力的规划组件。

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

可见当前人们已经开始探索如何把 interaction loop 交给模型。

### Code 可以是工具，但不应该成为一切的核心

回到对 CaP-X 的讨论。CaP-X 生成的程序会调用 SAM3、Molmo、OpenCV、Open3D、IK、运动规划和碰撞检测等感知与控制原语，它实际上已经集成了相当多的 tools。

不过，与我们把数字世界的 SWE 迁移到物理世界的直觉相悖，它把 python program 放在了过于中心的位置，默认把代码作为机器人高层行为的主要控制平面。在 CaP-X 中，一个 code-environment turn 对应一次模型调用：模型生成 Python program，环境随后把这段程序执行到结束；程序内部可以连续调用多个感知和控制原语，程序执行结束后，模型才重新获得控制权。

但物理世界并不总像执行一段 shell script。

插入、倾倒、擦拭、开门、拥挤环境导航等任务，都可能需要连续视觉反馈、接触反馈、外部事件和安全中断。在一个固定的状态下，得到的反馈不一定如 code 一般完全可复现、无噪声。而一个动作在开始时合理，并不意味着它在三秒后仍然应该继续执行。

如果参考 SWE 类型的 Agent 设计的思路，物理世界的 Embodied Agent 更可能是类似于一个掌握了相当多种模型作为工具的存在。

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

代码，在这些工具中是重要的 meta tool，可以在预定义的 tool / skill 不能适配的情况下临时合成新 skill、生成局部 controller 等———起到增强扩展性的作用；它不应该默认替代 VLA、WAM、导航系统和专门的低层 controller。

一些 VLA-as-Tools 已经沿着这个方向推进：高层 VLM 负责场景分析、全局规划和失败恢复，多个 specialized VLA 则作为有明确边界的工具执行局部物理任务。作为 tool 的 VLA 在执行过程中向上层提供 progress feedback，使 agent 可以根据事件重新规划，而不是持续高频轮询。

我们已对诞生于数字世界的上层模型充满信心——它朝着 AGI 的方向大步流星地迈进，仿佛明天就挑战菲尔兹奖。不过它在具身领域做的事情显然配不上它在数字世界的超绝大脑。

![上层 LLM 能力与具身智能基础认知能力的反差](/assets/posts/polaris-bench/llm-fields-medal-vs-embodied-reality.png)

而在这个设计方案里，除了要加强上层模型对物理世界的认知能力，我们还需要训练下层模型作为一个可靠的工具被调用的能力。一个 VLA tool 需要明确知道：调用指令的边界是什么；什么情况下应该开始；什么情况下应该结束；什么时候应该报告失败；中间进度如何反馈；被打断后如何安全退出，等等。

与此前大家喜欢把 VLA 描述成 agentic LLM 的竞争者不同，我直觉上类比它是未来 embodied agent tool 生态中非常关键的一类执行器——且二者需要被协同训练。

[Thea](https://arxiv.org/abs/2608.11246)和我们的视角比较类似，提出了集成多种 tool 的 harness，它把 VLA、VLN、manipulation 的模型们都注册为了 LLM harness 中的工具。和我们年初为 Agentic LLM 搭建的交互类似，也留出了类似于“看说明书”的 `load_skill` 工具。多说一句，我们年初的测试发现，现在模型在 Agentic 方面的泛化能力确实很强，我们版本的 `load_skill` 头部模型能够自主根据需要阅读说明并执行——有的模型，比如 OpenAI 家当时的 GPT-4o 和 Deepmind 当时的 Gemini 3.1 行为特征就不一样，前者喜欢冒进去直接尝试陌生工具的用法，而后者喜欢稳健读说明书后再行动，它们各有各的节能探索策略。仔细想想参考人类也是一样，我们玩游戏的时候也有人不爱看新手指南，而有人离不开说明书。这种泛化性大概得益于 SWE 任务的充分训练，基座模型在代码以及 workspace 任务中充分学习到了在数字世界冲浪的要义。

### 只搭 Harness 就够了吗？

在和一些具身背景的研究者讨论 CaP-X 时，我经常听到一个看似务实的判断：

> 既然 Codex、Claude Code 这类 agent 的能力很大程度上来自 harness，那么具身团队只需要把 tool、memory、runtime、verifier 和任务流程搭好，模型本身交给基模厂商继续迭代就可以了。

从风险厌恶的视角看，这个判断确实合理。coding agent 在过去一两年的进步，确实让很多人第一次直观感受到了 harness 的力量：同一个模型，换一套更好的工具、更清晰的上下文、更可靠的测试环境和更完整的反馈循环，能力可能发生非常明显的变化。OpenAI 在总结 Codex 的 harness engineering 经验时也强调，真正困难的工作越来越集中在环境、反馈循环、工具和控制系统的设计上；同时他们也明确提醒，当前表现高度依赖特定仓库的结构和工具，不能直接假设它会自然泛化到其他环境。相信经历过初期 harness 搭建的工作者，都会对模型能力进化逐渐吞噬早期像拄拐一样的预定义 agent 能力的趋势有深刻体会。

那么我们真的可以假定模型随时可替换，具身团队只需要迭代外层 harness 即可吗？

这个判断混淆了以下两点：

1. harness 能把模型已经具备的能力释放出来；
2. 模型能通过与 harness 的交互，学会一种原本并不具备的新能力。

前者是能力提升的手段，后者才是能力学习本身。一个设计良好的 harness，确实可以让当前模型立刻表现得更好。但如果模型每次犯错，都只能由工程师在外部增加一条 prompt、一段 fallback、一个特殊 verifier 或一条 if-else 规则，那么这些错误并没有真正转化成模型的经验。
系统只是变得越来越会扶着当前模型走路。模型本身并没有学会走路。

此外，模型本身也并不是一块即插即用的万能组件，它需要高度适配 harness 和环境，进行协同训练，才得以良好工作、不断进化。harness 决定模型能够看到什么、调用什么和如何获得反馈，但模型本身决定它能不能真正理解这些反馈，并在长程交互中形成有效策略。

——到了物理世界，这种耦合只会更强。

一个 embodied agent 需要学习的，不只是某个工具的 JSON schema，还包括与物理世界交互的工具：

- 什么情况下应该调用 depth，而不是继续使用 RGB 猜测；
- 什么情况下应该让 VLA 继续执行；
- 什么情况下应该取消或抢占正在运行的动作；
- 如何理解和适应感知误差；
- 如何根据工具的成功率调整信任程度；
- 如何把异步的 progress event、视觉变化和安全中断整合进当前 belief；
- 如何判断一次探索是否值得它产生的时间、能耗和风险。

它们可以暂时被写进 prompt 和 workflow，但如果我们希望模型在新任务、新环境和新工具上泛化，最终仍然需要让模型在真实的交互中学习。

我认为 harness 设计之初一般有两种目的：拐杖或训练场。

拐杖，是对已有上层模型的能力补偿。现有工作，无论是 Cap-X 还是已经整合了丰富工具的 [Thea](https://arxiv.org/abs/2608.11246) 均是如此。它围绕当前模型的缺陷不断加入：特殊 prompt；task-specific workflow；手工 recovery branch；特定模型才能理解的 observation format；静默接管模型错误的 fallback；为某几个 benchmark case 专门设计的工具组合。其实很像 2024 年左右的人工定义 agent workflow。

这种 harness 很可能对当前 demo 和产品交付非常有效。它有真实的工程价值，也可能是产品落地阶段不可避免的选择。

但如果其中产生的经验不被用于训练，模型的能力就不会随着系统使用而增长。换一个模型，很多规则可能需要重新调；换一个任务，原有 workflow 可能不再适用；一旦进入开放环境，系统又要继续增加新的补丁。毕竟不同模型的偏好不一致，需要被“辅助”的点也不一样（有的模型倾向保守，有的模型更激进，天然适配不同的 harness 风格）。

它帮助模型完成了任务，却没有让模型吸收完成任务所需的能力。——更狂妄的说法是，这不是通往 AGI 的道路。

而另一种我觉得十分有必要被搭建、且现阶段由于看不到成果而被轻视的，是训练场——学习基础设施型 harness。做 coding RL 的朋友们一定对此感到熟悉，这类学习基础设施型 harness 提供：

- 通用而稳定的 observation/action interface；
- 可扩展的工具空间；
- 可验证的任务目标；
- 有语义的执行反馈；
- 可记录的长程 trajectory；
- 对失败阶段的定位；
- uncertainty 与 safety signal；
- 可用于 SFT、RL 和 distillation 的数据闭环。

它今天帮助模型工作，明天又把今天的失败转化为新的训练数据，使下一代模型不再需要同样程度的外部补偿。正如我们使用的 Codex CC DSH 等，都随着使用而成为了基座模型数据飞轮的一部分，人们不断的使用源源不断为模型提供新的训练场，使模型不断迭代进化。

Sutton 在 [The Bitter Lesson](http://www.incompleteideas.net/IncIdeas/BitterLesson.html) 中写道：

> We want AI agents that can discover like we can, not which contain what we have discovered.

这启发了我们，拐杖型的 harness——模型只负责填充 workflow 中预留的几个空格——固然能提供工程满足感，短期快速见效，但长期来看，我们真正应该构建的不是越来越复杂的人工流程，而是能够通过 search、interaction 和 learning 自己发现有效策略的系统。

所以我不认为具身团队只需要搭建 harness。我们可以基于基模不断提供的通用认知先验，接入一个具身训练场 harness，让训练场中的上下层模型在交互中不断磨合、在闭环中互相适应各自的能力边界，成功和失败轨迹都能不断回流训练。

关于这一点，我在之前的工作中也走过很多弯路。比如为了找一个已训练出的模型能用的 demo 轨迹汇报，疯狂调整调用 tool 的 prompt、在协调感知模型与长程 Agentic 模型上下了很大功夫，换一个场景效果就掉的很厉害——上一个 case 的成就感就是下一个 case 的挫败感。虽然我觉得这个弯路是现阶段所必须的，只是认为我们不应满足于此。而反思我们此前的工具设计也非常局限——别忘了作为工具的模型能力和能力范围都在迭代，像 Thea 一样预定义好哪个工具管什么 scope 也是不能长期适用的。

### 数字世界天然提供 stdout 和 stderr，物理世界没有

Coding agent 之所以能迅速发展，不只是因为 GitHub 上有大量代码数据，也因为软件环境对 agent 极其友好。

一个 coding agent 通常可以获得文件内容、目录结构、编译错误、堆栈信息、stdout 和 stderr 等等很多信息，重试廉价，结果可复现性强。这些反馈能不断修正模型对代码仓库的理解。

物理世界则恰好相反——充满了噪声，变化和不确定，正如人无法踏入同一条河流（时间维度状态不稳定），又如一千个摄像头能拍出一千个哈姆雷特脸上的噪点（确定性受多重影响，基于同一个 state 和 action 后拿到的观测不能稳定复现）。

设计 SWE 任务的时候，我们能放任模型去跑多次重试 debug，除了重试成本低、观测反馈稳定以外，还有个关键就是结果的判断简单：运行程序和测试，拿到 stdout stderr，以此更新 belief，再来 roll 一个 action。而物理世界的 feedback 是比较复杂的，可能会包含非常复杂的状态反馈（当前简直是被 overwhelmed，我始终觉得减少设计，让模型自己去适应最好，优雅的东西都是简单的，或许我们需要找到物理世界的 stdout 和 stderr）：

```
status:
    accepted | running | succeeded | failed | uncertain |

blocked progress:
    current_stage
    elapsed_time
    expected_remaining_time

state_delta:
    observed_changes
    expected_but_unobserved_changes
    possibly_affected_objects

evidence:
    sensor_sources
    timestamps
    viewpoints
    confidence

failure:
    failure_type
    recoverability
    safe_to_retry
    suggested_next_observation

control:
    cancellable
    preemptible

safety_events:
    collision_risk
    force_violation
    human_proximity
```

由于物理世界有时间变化，比起 coding agent 里假设仓库都是静态的，上层模型不能在这十秒内完全“失聪”，也不应该只能等 tool return 以后再思考。它需要能够在动作执行期间继续推理，根据新观察取消或抢占动作，响应 safety interrupt，在真正发生重要变化时重新规划。很多 harness 如 codex 虽然接受任务过程中新请求进入 steer 正在进行的任务，但是那也是在轮次边界发生，不足够实时。

最近有很多工作和流式 LLM、interactive model 有关，我们也在思考这个方向。目前能感觉到的瓶颈——和高频具身模型的瓶颈类似——实时依赖高频 chunk，或者多流，都会让 KV Cache 疯狂膨胀。之后有空针对这个扩展讨论，我觉得高频的感知，尤其是视频似乎天然适合压缩。

物理世界中的 tool call，本质上不是一个瞬时、同步的函数调用（直接沿用相对静态环境的 coding agentic LLM 和在短时间间隔内可以忽略环境变化的高频 policy 的 POMDP 建模是否站得住脚），而是一个有持续时间、期间环境仍在变化的过程。

### Long Horizon 层面的的鸡同鸭讲

具身领域常常把任务持续的物理时间或动作步数称为 long horizon。这很自然，具身的 system 0、1 模型交互频率极高，从 action sequence 的序列长度看，真的非常长了，完爆我们几百轮的 coding agent。但直觉上具身的长程还是类似于 12 分钟任务（[A Human-in-the-Loop Lifelong Code Generation Framework ](https://arxiv.org/abs/2509.18597)）——和 [Frontier SWE](https://www.frontierswe.com/) 相比物理时间很短。

这时候立刻联想到的是不眠不休直播分拣和机器人马拉松，这类时间上够 long 了吧？物理时间上确实，但直觉上也不够 long horizon。

我们做大模型的对 AGI 的畅想比较激进（谁让奥特曼天天瘫坐），感觉聊长程的时候，我们还需要更有效的 agentic horizon 定义。

希望这个 long 是依赖层面的 long——开玩笑说，如果几个 sink attention 配合 streaming window 就能无限完美解决的任务真的能叫长吗？

```
          Effective Agentic Horizon
          / Dependency Horizon
                    ↑
                    │
                    │       SWE Agent
                    │       Long-horizon planning
                    │       household task with delayed consequences
                    │
      Short task    │
      with hidden   │
      dependency    │
                    │
────────────────────┼────────────────────────→
                    │                 Execution /
                    │                 Action Horizon
                    │
      Pick & place  │       Package sorting
      Reactive VLA  │       Marathon locomotion
                    │       repetitive warehouse work
                    │
```

上图是 GPT 帮我画的四象限，它在尝试描述长程任务。

- 左下：Short execution × Short dependency
    - 更像是 Reactive skill，比如 pick-and-place，grasp，single-step VLA，visual servoing
- 右下：Long execution × Short dependency
    - 我管它叫 persistent reactivity，各种直播和比赛所挑战的，长时间分拣、持续locomotion、重复性工厂工作，跑马拉松——有的时候像是压力测试，考验耐力但不需要脑子记很久。
- 左上：Short execution × Long dependency
    - 这个象限有点反直觉，可能是一些比较 tricky 的情况。需要一个 task 很快结束，但是需要记住一开始隐藏的要求，根据很早以前的一个 instruction 做决策，或者是延迟性的指令跟随，其实也像是 long-dependency reasoning
- 右上：Long execution × Long dependency
    - 这是作为我们 Agentic LLM 出身的人第一直觉下的 long-horizon agency，通常包括 SWE，open-ended research agent，复杂的家务机器人任务（替代保洁阿姨的工作全程）——这些任务的早期行为都会对后期的可行性有影响。

对我们从“右上” Long execution × Long dependency 思维切入的人，最自然产生的系统观是——把左下角的 reactive competence 封装成为 工具 tool，skill 或者动作原语。这就很像从 SWE agent 借来的 motivation。

### 衡量即时准确 vs 探索的长期收益

能感觉到具身领域，大家的 demo 都围绕着固定的几个场景。这应该也和物理世界比数字世界困难太多有关。

与 SWE 任务训练的时候天然放任模型去探索不同，由于物理世界的试错成本过高，对单次任务而言，“第一次进入环境后到处看看，再慢慢熟悉”通常不是一个美观的解决方案。对自动驾驶、工业机器人和产品 demo，任务成功率、实时性、路径效率和安全性天然具有更高优先级。

现有具身领域 Benchmark 所定义的优化目标也针对此考虑，它们以一个 episode 为优化周期：

- 探索只产生即时成本；
- 新获得的知识不能在后续任务中体现价值；
- 每个 episode reset；
- agent 没有机会摊销环境学习成本。

但一个真正部署的家庭机器人不会只执行一次任务。它可能在同一套房子中工作几个月。如果第一次寻找充电宝时的探索，可以让后续十次取物任务都更快，那么这次探索就是有价值的。

所以未来我们或许需要一个指向新优化目标的 Benchmark，让模型能学会衡量这次探索所获得的信息，能否在未来任务中摊销它的成本，而不是惩罚它一次的绕路。**Agentic 的本质之一，就是允许模型花 action budget 去买信息**。

当然，在持续学习的问题被彻底解决之前，我们大模型数据工也无法自信地声称能解决一个跨度如此长的任务。

### 具身智能需要自己的 SWE-Bench——先定义问题，而不是先定义 Agent
SWE-Bench 为 coding agent 社区建立了一套共同语言。不同团队可以训练不同模型、设计不同 harness，但最终都落脚于 agent 能否自主理解一个陌生仓库，通过工具交互和失败反馈，完成一个可验证的软件工程任务。

**具身领域现在缺少类似的北极星**。一个从 agentic 的 long horizon 程度合理、可验证的评测集，能连接来自 LLM agent 和 agentic RL 与一类来自机器人、VLA、WAM 和自动驾驶的研究者。

或许，作为起点，我们并不需要一开始就回答“具身 Agent Harness 应该长什么样”。我们甚至不应该过早地规定模型必须使用地图、VLA、WAM、代码还是某一种 memory architecture。一个真正有生命力的 benchmark，**应该尽量规定问题，而不是规定答案**。

此时更重要的，也许只是**构造一个能够产生这种长期交互问题的环境**，以及**定义足够可靠的验证方式**。

如果目标是推动 agentic RL，那么第一步甚至未必需要发生在真机上。探索、失败、重试和长程 credit assignment 都需要大量 rollout，而真实物理世界恰恰让这些行为变得昂贵、缓慢且难以复现。因此，一个务实的起点是先把问题限制在数字世界中的高保真仿真环境。至于它最终使用什么 Harness、什么模型架构，以及这些能力怎样迁移到真实物理世界，留作下一阶段的问题。
