---
title: Astra Robotics 大考：大模型离真正的机器人大脑还有多远？
date: 2026-10-27
lang: zh-CN
description: 从三份系统评测出发，追问通用模型的具身能力如何被接口、历史、反馈与物理时间塑造。
tags: Embodied Intelligence, Agentic Systems
layout: report
draft: true
---

:::takeaways

**通用大模型已经具备作为机器人策略（Robot Policy）的能力。** GPT-6 Astra 可以通过多种形式完成具身任务：作为 Agent 进行规划和工具调用、配合 Robot Foundation Models（RFM）执行动作，或直接预测控制指令。近期几篇系统性评测 [1][2][3] 与我们自己的初步实验观察相互印证，展示了通用模型在具身任务中的潜力，也表明其最终表现很大程度上取决于 Harness 的组织形式与控制接口设计。

**Harness 的组织形式、Context History 与 Test-time Budget，对最终表现有显著影响。** 与直觉相符，保留完整交互历史能够大幅提高任务成功率；更充足的仿真执行预算，也能为探索和纠错创造更多机会[1][3]。 相较于主要依赖当前观测或短期历史的传统 RFM，Agentic Policy 能够利用过去的动作、反馈和失败经验进行持续的 *trial and error*。这种能力强烈依赖长期上下文，也使 Context Management 成为重要的系统设计问题。有意思的是，这与 Coding Agent 的发展高度一致：Agent 的能力不仅来自模型本身，也来自 Harness 如何组织历史、工具、反馈与探索过程。对历史信息进行有效压缩，同样可能成为提升具身 Agent 效率的重要方向。

**对于直接控制，动作表示本身就是一个关键的设计选择。** 多项评测观察到，Astra 预测末端执行器（EEF）目标通常比直接预测关节角度表现更好[1][3]。 这可能一方面来自训练数据的分布，另一方面也与两种表示的学习难度有关：EEF 描述的是相对本体无关的任务空间目标，而关节角度与具体机器人的运动学结构紧密耦合。因此，EEF 可能更容易利用跨本体数据进行扩展，也更契合 VLM 在预训练中获得的空间理解能力。当然，这一解释仍是值得进一步验证的假设，而非实验直接证明的因果关系。

**实际部署的核心瓶颈仍然是时间预算，以及推理与物理世界演化之间的不匹配。** 仿真环境可以冻结时间，为 Astra 提供充足的推理机会；但现实世界不会等待数秒乃至更长时间的 inference[1][2][3]。这不仅是降低推理延迟的问题：当模型还在思考时，环境状态可能已经改变，之前的观测和计划也可能失效。因此，未来的 Physical Agent 或许需要从传统的 Turn-based Interaction，进一步转向能够持续接收观测、异步更新决策，并与底层控制并行运行的实时交互范式。

**物理状态验证与失败恢复，仍是当前 Agentic Harness 难以彻底解决的问题。** 现有评测表明，即使增加视觉信息或提供充足的执行预算，Astra 也未必能可靠判断物体是否真正接触、插入或完成操作；失败后的反复尝试也可能无法恢复任务，甚至破坏已有进度。[1][2] 这让我联想到早期 Coding Agent 经常陷入的错误循环：模型虽然具备探索能力，却缺乏可靠的状态验证与从失败中学习的能力。参考 Coding Agent 的发展，未来更充分的数据覆盖、更明确的环境反馈，以及面向长时程交互的 RL，或许能够改善这些问题。但物理世界中的接触约束、不可逆动作与安全风险，也意味着具身 Agent 的错误恢复可能比软件环境更加困难。

**以 Astra 为代表的 VLM 正在学会行动，而以 π0.7 为代表的 VLA 开始拥有记忆、学会思考。**[4]Sys-2 和 Sys-1 切入视角逐渐收敛。
:::

## Overview — Three Ways to Turn Astra into a Robot Policy

目前常见在具身基准任务测评 GPT-6 Astra 的方案，主要可以归类为三种控制范式：

- 直接控制 Direct Policy：大模型直接生成机器人动作
- Agentic Policy：大模型在（持久化的） Agent Harness 中，通过工具调用操作机器人
- RFM-Assisted Policy：大模型与 VLA/WAM/WBC 等模型进行协作的模式，大模型在其中的定位为审查、修改 RFM 模型提出的动作，或者生成子任务目标

:::figure 1

截止目前，除了关注该主题的人一些简单的启发性测试外，来自不同机构的研究人员对 GPT-6 Astra 在具身基准任务上的能力已进行了较为详尽的探索。本文主要关注以下三篇工作：

| 研究 | 评测特色 | 主要 insights |
| --- | --- | --- |
| [1] SenseNova<br />Has GPT-6-Astra Achieved Embodied Intelligence? | 12 个 benchmark、ICL、10× step budget、8 种真机平台 | 提供 Test-time scaling 的预算，或 ICL 评测协议，Astra 具备更高的能力上限 |
| [2] Galbot Team<br />Systematically Exploring the Capabilities of<br />GPT-6 Astra as Embodied Policies | 六类具身任务，Direct / Hybrid 和具体动作控制对比 | Astra 在跨本体、灵巧操作的能力 |
| [3] NVIDIA Research<br />Astranomy: An empirical study of GPT-6 Astra as a native robot policy | 基于 RoboLab-120 基准，做了多轴的 inference-time ablations | 不同控制接口和 Harness 如何影响 Astra 的能力 |

## 1 Unlocking Embodied Capabilities: ICL, Interaction Budget, and Their Limits

*SenseNova：配以 ICL 与更多探索预算，能力上限能提高多少？*

### 1.1 Physical ICL：通用模型已有知识在具身任务中被激活的方式

具有划时代意义的 GPT-3 展示了预训练 LLM 的 one-shot / few-shot 能力：保持模型权重固定，将任务示例放进上下文，再评测它对新输入的回答。GEN-1.5 的技术报告引用 GPT-3 的语言任务结果——one-shot 约 45%，few-shot 约 65%——并将这套评测思路迁移到物理世界：用一段观测与动作示教作为上下文，检验预训练模型能否在新场景中完成任务。[5][6]

:::figure 2

GEN-1.5 在十个短时程任务上报告 one-shot ICL 平均成功率 59%：仅将示教放进上下文，直接评测预训练模型。作为进一步适配的对照，使用少量数据做 10 次梯度更新后，成功率达到 83%。报告还展示了跨示教组合与非示教路径的行为。[6]

:::figure 3

SenseNova 也提出使用 ICL 的方式对 Astra 在具身基准上进行评测。与 GEN-1.5 更 Physical Native 的演示不同，SenseNova 照顾到 Astra 是一个在代码 Agentic 任务上被深入后训练过的模型，虽然也不包含任何梯度更新，但示范的构成是让 Astra 以 Agentic 的方式去探索训练数据，基于此完成对应任务。[1]

:::figure 4

SenseNova 的这种 ICL 方式，我个人看来没那么 Physical Native，偏向模型通过阅读资料学习的能力。考虑到他们的目标是探索 Astra 在具身任务上的能力边界，针对一个主刷 Agentic 榜单的模型，尽量提供更系统的工具是有必要的。

不过，如果人们的研究视角着眼于模型对多来源数据的综合压缩带来的能力泛化上，GEN-1.5 更符合日常使用场景的示范（先看老师做一遍，然后照猫画虎）。后续我考虑专门讨论我们在开源 VLM pretrain 模型上简单加训一些具身开源数据后，更贴近 Physical ICL 的观察——虽然还很初级，但我们初步感受到，混合训练文本和很少量的具身领域数据（真机或 Ego）后，VLM 基座能够获得一些初步的 Physical ICL 能力；跨本体以及互联网视频数据配合文本与多模态理解数据等的训练时 scaling，比起单纯堆砌昂贵的具身任务数据可能会更有机会让模型完成物理世界的下游任务。

或许我们期待的在物理世界发挥能力的超级智能形态，能自如适应 GEN-1.5 和 SenseNova 两种 ICL 评测，能文能武。

### 1.2 More Interaction, More Capability：评测预算限制了Astra

大模型角度切入的从业者看多了越来越复杂、流程越长越长的 Agentic Bench，会不习惯具身领域任务的 long-context 定义。此前或许是因为模型在物理世界能适配的任务流程较短。

SenseNova 的评测发现，在最多 10× 标准动作步数预算下，观察到 Astra 许多任务成功率继续提升。例如，LIBERO 系列和 SIMPLE 接近饱和，DexJoCo 和 VLN-CE 达到约 90% 的水平。[1]

:::figure 5

事实上，在我此前的 Robodojo 评测中，Astra 也表现出明显的探索与重试倾向。部分 episode 在标准步数限制内因 timeout 失败，但观察完整的执行过程，会发现它仍在尝试调整策略、修正物体位置或重新建立抓取。这提示我们，固定的短评测预算可能低估了这类 Agentic Policy 的潜在能力。

### 1.3 放开评测预算并不能解决一切问题

当然，无限放宽评测预算并不能带来全部问题的解决。SenseNova 的失败分析总体可以整理如下：

| Limitation | 评测中具体体现 | 可能的解决途径 |
| --- | --- | --- |
| ICL transfer | knowledge 高度任务相关，迁移至未覆盖任务时收益下降 | 更通用的物理预训练提高覆盖 |
| Physical verification | 看起来已经插入、挂上或接触，但物理成功条件并未满足 | 物理状态估计、接触反馈、可靠 verifier |
| Consequential actions | 倾倒、掉落或破坏前置条件后难以恢复 | 风险敏感探索（或许借助世界模型）与恢复策略 |
| Long-horizon progress | 后续动作破坏已经完成的子任务 | Belief / progress tracking |
| Time & cost | 大量 token、长时间推理和重试 | 更高效的推理与交互范式 |

:::figure 6

图示为提供 ICL 和足够交互预算情况下依旧失败的部分 case。

SenseNova 的原文里把拼插类交互的失败归为 Astra 在精密物理操作领域的局限性。不过我倾向于认为，**Astra 训练时很可能还是见过大量的触觉反馈数据，只是 SenseNova 的评测配置忽视了触觉反馈**。因为同期研究[7][8]在仿真环境给 Astra 触觉后，模型在插入问题上的成功率有显著提升。

:::figure 7

另一类失败则源于类似倾倒、掉落这类破坏前置条件后难以恢复的任务类型。未来或许可以考虑在这类风险的任务上让模型“三思而后行”，比如借助世界模型的 next state prediction 能力，选取一个低风险路径；或是利用更精细的反事实数据对，后训练模型学习高风险情况下的行为策略。

## 2 From Grippers to Dexterous Hands: Where General-Purpose Control Breaks Down

*Galbot：通用模型作为控制策略在六类具身任务、不同控制接口、精细物理操作上的表现*

此前令大家“震惊瘫坐仿佛看到原子弹爆炸”的更多是机械臂夹爪任务。Galbot 的这篇研究则更充分地测试了 Astra 在不同类型本体上的实际表现。与体感一致，在机械臂夹爪操作或导航任务以外的，富接触、自由度更高、更依赖手指协调的任务上，Astra 作为通用大模型目前还没具备即插即用的控制能力，需要借助低层控制先验。

### 2.1 Capability Landscape

Galbot 的评测结果主要包括 6 个领域的评测。本文评测中的 Direct 即我们所说的 Direct policy；Hybrid policy 是前文所述的 RFM-Assisted 方案，具体来说 Astra 审核 π0.5 提出的方案、监督它的执行，并在必要的时候直接介入调整后者提出的策略。

| Domain | 主要结果 | insights |
| --- | --- | --- |
| Gripper Manipulation | RoboDojo Hybrid 48%，Direct 26% | Policy assistance 改善接触敏感的长程操作 |
| Dexterous Manipulation | Hybrid 平均 Score 61.6，Direct 16.6 | 手指接触协调是明显瓶颈 |
| Mobile Manipulation | RoboCasa Hybrid 38.7%，Direct 33.3% | Hybrid 有总体收益，但并非所有任务受益 |
| Navigation | RxR 92%，HM3D 82% | 语义导航较强，但搜索路径可能低效 |
| Locomotion | 单个障碍课程的 5 次连续尝试均未到达终点 | 稠密的身体运动参考仍不可靠 |
| Humanoid Loco-Manipulation | 30 个 HumanoidBench 任务中 13 个超过比较基线的最佳结果 | 高层决策可与现有全身控制器形成互补 |

### 2.2 Dexterity：高层纠错不能替代精细接触控制

:::figure 8

Galbot 的评测中，我们看到在灵巧类操作中 RFM-assisted policy（原文中 Hybrid）的综合效果是最好的。他们还发现，Astra 通常只很少量地修订 π0.5 提出的动作，大约 88% 的执行步数来自未修改的 π0.5 策略，只有剩余 12% 受到 Astra 的修正。说明少量策略级干预可以带来较大收益，而低层运动主体仍然依赖学习到的控制先验。[2]

我倾向于认为，夹爪与高自由度灵巧手之间的差距，部分来自数据覆盖的不均衡，也可能来自两类动作空间的本质差异。前者可以在很大程度上被抽象为 EEF 轨迹加开合控制；后者还需要在连续运动中维持支撑、改变接触点、协调手指姿态与施力。**这部分能力或许还需预训练提供更充足的数据覆盖，以及专项后训练增强。**

### 2.3 General Purpose 大模型的长程与泛化优势

:::figure 9

Astra 在 Robocasa 365 上的评测，呈现出一组非常符合我们对大模型预期的样子。在 Composite unseen 类型的任务上，Astra Direct Policy 达到 56%，高于 RFM-assisted 策略的 36% 和独立 π0.5 的 4%。[2]这非常好理解，从以前的经验来看，π0.5 高度依赖后训练，从 case 看体现出非常盲目贴合已学习轨迹的特征；而通用大模型早已经历长期大量的无监督预训练配合深入的长程 Agentic RL 积累，具备了足够的探索特性（后文中我实测的轨迹中也有体现）；规划执行长程任务，也是通用大模型带着探索的上下文历史训练后十分擅长的领域。

针对同一评测基准，Long WAM[9] 也搭建了一套结合 GPT-6 Astra 的快慢脑系统。他们发现在 GPT-6 Astra 的加持下，自己提出的方法在每一个 split 内均有额外的明显提升。他们同样也观察到** Astra 非常擅长长任务里的恢复与修正**。

:::figure 10

## 3 Anatomy of an Agentic Robot Policy: What Actually Matters?

*Astranomy：一份 Robolab 上系统的消融实验*

本篇主要记录了 NVIDIA 的研究人员在 Robolab 上做的非常详尽、系统的消融实验。它测试了 Astra 作为通用模型，使用不同的控制接口、上下文历史情况、prompt 内提供的本体及感知侧文本标注等不同条件下的不同表现。

我认为一个核心的结论是，**Agentic 方案配充足的文本上下文探索历史，详尽描述本体及感知侧信息，是当前的最优选。**

### 3.1 Action 表示方面，EEF 优于 Joint Position

:::figure 11

Astranomy 细致消融了在 Direct Policy 或 Agentic Policy 下，使用 EEF 或 Joint Position 作为表示的评测效果。结果表明，Direct Policy 下，使用 EEF 效果明显优于使用 Joint Position。[3]

这可能有很多方面的解释。一方面，EEF 表达的是末端在任务空间中的目标，更容易跨机器人本体共享。另一方面，通用 VLM 已经通过视觉、空间和几何推理任务学习了不少与位置、姿态有关的知识，直接要求其预测 EEF 可能更符合这些先验，而非直接预测某个机器人特有的关节构型。

此外，本质上 **EEF Action 将部分运动学求解和约束满足转移给了机器人控制器**。 因此，比较的并非只是模型预测两种数字表示的能力，还包含了控制接口对任务难度的不同分解。

如果关注 Agentic Policy 下，目标的表示使用 EEF 或 Joint 就不再有如此明显的差距。或许当使用擅长处理代码的 Agentic 框架时，harness 借助代码能力，完成了部分运动学求解的工作，进而达成了“外包”给控制器的相似功效。

### 3.2 History：对 Agent 而言，交互历史十分关键

:::figure 12

:::figure 13

图中分别展示 Direct Policy 中 current frame 与短期 observation history 的差异，以及 Agentic Policy 中文本/视觉历史的不同保留方式。[3]

这张图实际上揭示了两个层次的记忆：

- Short-term observation history 更接近状态估计，帮助模型理解运动方向、近期动作结果和物体变化
- Long-term interaction history 则包含之前的动作、计划、决策和尝试，使 Agent 能知道已经做过什么，以及下一步为什么要改变策略。

此前我一直感到疑惑，为什么以 π0.5 为代表的传统 System-1 VLA 的训练往往侧重当前状态或短期视频窗口，而不是完整的交互历史？对长时程具身任务来说，历史不仅是额外的视觉观测，更是保存行动意图、失败经验和任务进度的关键载体。Coding Agent 中已广泛使用的 Context Management 与 Compaction，或许同样值得成为机器人策略训练的一部分。<br />结果显示，action/feedback-level memory 与 agentic context，它们比短期 frame stacking 更丰富。细看消融，我们发现文本上下文的历史起到了非常大的作用。此前大家关心的，早期 VLA “是否如它所预期的真的用上了 language backbone 的能力” 在 Astra 这充当 robotic policy 的 VLM 这里倒是得到了解答。**文本上下文十分重要**。

### 3.3 Harness 本身就是 Policy 的一部分

除了从 harness 保留历史的角度出发，prompt 提供对本体以及 Camera Geometry 的具体描述，也能大幅提高 Direct Policy 下的成功率。[3]如果模型不知道末端坐标定义、相机外参、夹爪几何结构，即使具备很好的空间理解能力，也未必能把它转换为正确的控制量。

:::figure 14

:::figure 15

我认为这是和训练数据直接相关的。为了将 VLM 模型训练得尽量通用，肯定会不限制数据的本体和来源（ego、真机还是仿真），尽量在预训练阶段“暴风吸入”。VLM 又是一个语言部分占主体，同时也在训练大量文本 corpus 的模型，那么构造不同来源具身数据的时候，对本体和 camera geometry 进行 label 后进入训练也是十分自然的。推理是额外提供给模型这些信息，除了辅助它利用原本多模训练带来的空间理解能力外，或许也与训练数据本身也更 align。

### 3.4 Python Tools 几乎没有改善成功率

作者开放了基础数学计算、图像裁剪、相机几何计算、三角测量、逆运动学和持久化 notes 等工具给 Astra，评测中启用工具的 150 个 episode 都执行了 Python 和几何计算，平均每 episode 约 19.7 次工具调用。但总体收益仍然很小（无 tools 的 86.0% 到有 tools 的 88.0%）。[3]

这些工具并没有提供超越当前固定视角图像理解能带来的更多额外信息（比如换角度观察，精细的物理接触，或触觉反馈等），还是基于已有图像做二次加工。而 Astra 的原生图像理解能力可能已经足够好，提供这些工具并不能带来边际收益。

未来更值得研究的，或许是让 Agent 拥有更多真正可以改变信息状态或环境状态的工具：Active Perception、Physical Verification、Safe Exploration 等等。

### 3.5 From CaP to Agentic Robotics

近几个月，Agentic Robotics 的讨论逐渐开始火热。Anthropic 在《Claude plays robotics》[10] 中系统比较了直接控制、代码控制、预训练 policy 监督与 RL 等接口，其中的代码控制让人们想起了 Code-as-Policy 路线。

不过与 CaP[12] 以及后续的 CaP-X[13] 侧重于比较稀疏地生成可执行的控制程序不同，现代 Agentic Robotics 则更强调模型在执行过程中反复接收反馈、维护自身决策历史，并持续修改后续策略。

在 Astra 发布之前，VLA-as-Tools[14]，Harness VLA[15] 以及 VoLoAgent[16] 等工作实际都在尝试 RFM-Assisted Policy，尝试利用 sys-2 的 VLM agentic 能力，配合 VLA 这类 sys-1 模型解决具身领域的长程富接触问题。受限于当时的 VLM 没有进行充裕的具身数据灌入，VLM 的能力被限制在上层的规划与监控，没有直接介入控制的能力。而 Astra 显然同时具备 Agentic 层面的长程规划、trial and error，以及随时接入修正控制策略的能力。这让人不禁发问，如果成本和实时性问题被解决，sys-1 这一层是否还有存在的必要？

## 4 Beyond Success Rates: What Robot Rollouts Reveal About Generalization

**比起 Benchmark Scores，实际执行轨迹中展现出的行为模式同样值得关注。** 在我们对 Astra Direct Policy 的初步评测中，部分成功轨迹呈现出了不同于传统示教数据的操作方式：模型并非简单复现常见的模仿学习轨迹，而是能够采用其他合理且有效的策略完成任务。这种超越既有示教模式的行为多样性，或许暗示了通用大模型通过大规模预训练所获得的抽象世界知识与组合泛化能力，使其在物理世界中的决策不必完全受限于特定机器人数据集的行为分布。相比之下，以 π0.5 为代表的 VLA，其策略学习更加直接地依赖机器人动作数据。尽管这些观察尚不足以证明严格意义上的分布外泛化，但它们揭示了一种难以通过任务成功率直接衡量的潜力：**通用模型不仅可能学会如何完成任务，还可能探索出不同于既有示教的完成方式**

:::video-cases
【左右开弓的 robodojo。random number 排列，与 VLA Direct 测试】
:::

## 5 The World Does Not Pause: Reasoning Under Physical Time Constraints

*延迟、异步推理与持续运行的环境下的局限*

通用大模型在仿真中展现了很强的具身决策能力，但其交互范式仍然建立在“世界可以等待推理”的假设上。

| 研究 | 证据 | 关键含义 |
| --- | --- | --- |
| SenseNova [1] | LIBERO-Ultra-Long 约 900 万 token、接近 2 小时；RoboDojo 延长预算后单 episode 平均超过 3 小时 | 成功率提升可能伴随极大计算成本 |
| Galbot [2] | 30 秒 locomotion 运行需要 250 次同步调用，平均每次推理 39.86 秒 | 仿真中的 30 秒物理运动可能对应数小时实际推理 |
| Astranomy [3] | Direct EEF 平均每次调用 18.56 秒；推理占估计总执行时间约 97% | Agent 大部分实际时间都在等待下一段动作 |

或许，一些交互抽象的重构，可以在现有超强悍模型推理速度的限制下，一定程度上缓解实时性问题。

:::figure 16

在这方面也已有一些研究工作。

- **ARC：异步推理与控制解耦。** ARC 使用后台 VLM 更新 action-grounded reasoning trace，底层策略在执行 15 Hz 动作控制时消费最新有效 trace。其中的 reasoning 约 1 Hz 更新。[17]
- **Gemini Robotics ER 2：Bidirectional Streaming**。 Google 明确提出通过双向流式接口接收连续视频、音频和文本，并调用 VLA 与机器人 API。这里已经很接近 Agentic Physical Interaction 的产品级范式。不过，双向 API 流式交互不自动等价于模型内部 Observation、Reasoning、Action 三流同时自回归。[18]
- **Multi-Stream LLM** 与 **Engagement Process**：更彻底的模型和交互层统一。 Multi-Stream LLM 研究让多个输入和输出流在同一个模型前向过程中并行演化；EP 则将物理交互重新定义为共享时间线上的异步观测与动作事件。[19][20]两者可以很好地组合：EP 定义与环境交互的时序语义，Multi-Stream 架构负责学习这种时序下的信息处理与输出。

如果我们不再将机器人控制表示为严格串行的 Observation → Reasoning → Action 循环，而是让持续输入的 Observation、较低频的 Reasoning，以及高频 Action 共享一条物理时间线，那么是否能够同时保留大模型的长时程推理能力与实时机器人控制的要求？<br />进一步地，我们或许可以让这些不同速率的事件在同一个 Shared Causal Network 中联合训练，使模型不仅学习下一步做什么，也学习何时应该观察、何时重新思考，以及何时必须及时干预。

## 6 Converging Paths：VLM 与 VLA，终将殊途同归？

关注文本 Context history、world model 与 Agentic Control 的交汇。

【WIP】
