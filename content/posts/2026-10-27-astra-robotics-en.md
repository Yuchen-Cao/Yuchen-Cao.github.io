---
title: Astra’s Robotics Exam: How Close Are General-Purpose Models to Becoming Robot Brains?
date: 2026-10-27
lang: en
translationKey: astra-robotics
description: Drawing on three systematic evaluations, this essay examines the important roles of interface design and interaction history in Astra’s embodied-task performance. It also discusses limitations recognized in these evaluations but still unresolved: making use of real-time feedback and keeping model reasoning aligned with physical time.
tags: Embodied Intelligence, Agentic Systems
layout: report
draft: false
---

:::takeaways

**General-purpose models can already serve as robot policies.** GPT-6 Astra can perform embodied tasks in several ways: as an agent that plans and calls tools, in collaboration with Robot Foundation Models (RFMs) that execute actions, or by predicting control commands directly. Several recent systematic evaluations [1][2][3] and our own preliminary experiments point in the same direction. They demonstrate the potential of general-purpose models in embodied tasks, while also showing that their eventual performance depends heavily on how the harness is organized and how the control interface is designed.

**Harness design, context history, and the test-time budget have a substantial effect on performance.** As intuition would suggest, retaining the full interaction history can greatly improve task success rates; a larger simulation execution budget also creates more opportunities for exploration and error correction.[1][3] Compared with conventional RFMs that rely primarily on the current observation or a short history, an agentic policy can use past actions, feedback, and failures to sustain a process of *trial and error*. This capability depends strongly on long-term context, making context management an important system design problem. Interestingly, this closely parallels the development of coding agents: an agent’s capabilities come not only from the model itself, but also from how its harness organizes history, tools, feedback, and exploration. Effective compression of historical information may likewise become an important way to make embodied agents more efficient.

**For direct control, the action representation is itself a consequential design choice.** Multiple evaluations find that Astra generally performs better when predicting end-effector (EEF) targets than when directly predicting joint angles.[1][3] This may partly reflect the distribution of its training data, and partly the different learning challenges posed by the two representations. EEF targets describe goals in a relatively embodiment-independent task space, whereas joint angles are tightly coupled to a particular robot’s kinematic structure. EEF representations may therefore scale more readily with data from different embodiments, while aligning better with the spatial understanding that vision-language models (VLMs) acquire during pretraining.

**The central deployment bottleneck remains the time budget—and the mismatch between model reasoning and the evolution of the physical world.** A simulator can freeze time and give Astra ample opportunity to think; the real world will not wait through seconds, or longer, of inference.[1][2][3] This is about more than reducing inference latency. While the model is still reasoning, the environment may already have changed, invalidating its earlier observations and plans. Future physical agents may therefore need to move beyond conventional turn-based interaction toward a real-time paradigm in which they continuously receive observations, update decisions asynchronously, and operate in parallel with low-level control.

**Physical-state verification and failure recovery remain difficult for current agentic harnesses to solve completely.** Existing evaluations show that even with more visual information or a generous execution budget, Astra may not reliably determine whether an object has actually made contact, been inserted, or completed an operation. Repeated attempts after a failure may also fail to recover the task, or even undo progress already made.[1][2] This reminds me of the error loops that early coding agents often fell into: the model could explore, but lacked reliable ways to verify the current state and learn from failure. The trajectory of coding agents suggests that broader data coverage, clearer environmental feedback, and reinforcement learning (RL) for long-horizon interaction may help. Yet contact constraints, irreversible actions, and safety risks in the physical world also mean that recovering from embodied errors may be harder than recovering from software errors.

**VLMs such as Astra are learning to act, while VLAs such as π0.6-MEM are beginning to remember.**[4] As work such as ARC further introduces reasoning,[5] the approaches starting from System 2 and System 1 are gradually converging.
:::

## Overview — Three Ways to Turn Astra into a Robot Policy

The approaches commonly used to evaluate GPT-6 Astra on embodied benchmarks fall into three broad control paradigms:

- **Direct Policy:** the general-purpose model directly generates robot actions.
- **Agentic Policy:** the model operates the robot through tool calls within a persistent agent harness.
- **RFM-Assisted Policy:** the model works with a vision-language-action model (VLA), world-action model (WAM), whole-body controller (WBC), or similar component. Its role is to review and revise actions proposed by the RFM, or to generate subtask goals.

:::figure 1

Beyond the early, informal experiments shared by people following this topic, researchers at several institutions have now explored GPT-6 Astra’s embodied capabilities in considerable depth. This essay focuses on three studies:

| Study | Evaluation design | Main insights |
| --- | --- | --- |
| [1] SenseNova<br />Has GPT-6-Astra Achieved Embodied Intelligence? | 12 benchmarks, in-context learning (ICL), a 10× step budget, and 8 real-robot platforms | Test-time scaling budgets and ICL evaluation protocols reveal a higher ceiling for Astra’s capabilities. |
| [2] Galbot Team<br />Systematically Exploring the Capabilities of<br />GPT-6 Astra as Embodied Policies | Six embodied task domains; comparisons of Direct and Hybrid policies and specific control interfaces | Maps Astra’s capabilities across embodiments and in dexterous manipulation. |
| [3] NVIDIA Research<br />Astranomy: An Empirical Study of GPT-6 Astra as a Native Robot Policy | Multi-axis inference-time ablations on RoboLab-120 | Shows how different control interfaces and harnesses affect Astra’s capabilities. |

## 1 Unlocking Embodied Capabilities: ICL, Interaction Budget, and Their Limits

*SenseNova: How much can ICL and a larger exploration budget raise the capability ceiling?*

### 1.1 Physical ICL: Activating a General-Purpose Model’s Existing Knowledge in Embodied Tasks

The landmark GPT-3 paper demonstrated the one-shot and few-shot capabilities of pretrained language models: keep the model weights fixed, put task examples into the context, and evaluate the model’s responses to new inputs. The GEN-1.5 technical report cites GPT-3’s language-task results—approximately 45% in the one-shot setting and 65% in the few-shot setting—and carries that evaluation idea into the physical world. A demonstration consisting of observations and actions becomes the context for testing whether a pretrained model can complete a task in a new scene.[6][7]

:::figure 2

SenseNova likewise proposes evaluating Astra on embodied benchmarks through ICL. Its approach differs from GEN-1.5’s more physically native demonstrations, however. SenseNova takes into account that Astra has undergone extensive post-training on agentic coding tasks. No gradient updates are involved here either, but the demonstration process consists of letting Astra explore training data as an agent and then use what it learns to complete the corresponding tasks.[1]

:::figure 4

To my mind, SenseNova’s form of ICL feels less physically native and closer to learning by reading the documentation. Still, their goal is to probe the limits of Astra’s embodied capabilities. For a model that spends much of its time climbing agentic leaderboards, giving it a more systematic set of tools is a sensible choice.

If the research question is instead how a model’s joint compression of data from many sources produces generalization, GEN-1.5 offers a demonstration format closer to everyday learning: watch the teacher do it once, then have a go yourself. In a future essay, I hope to discuss some early observations of more physically grounded ICL after modest additional training of open-source pretrained VLMs on public embodied datasets. This work is still very preliminary. Even so, we have begun to see basic physical ICL capabilities emerge in a VLM backbone after mixing text with a small amount of embodied data, whether from real robots or egocentric recordings. Scaling training across embodiments and internet video, together with text and multimodal-understanding data, may give models a better route to downstream physical tasks than simply piling up expensive robot-task data.

Perhaps the physically capable superintelligence we hope for will handle both the GEN-1.5 and SenseNova versions of ICL with ease: equally happy to learn from a demonstration or to hit the books.

### 1.2 More Interaction, More Capability: Evaluation Budgets Can Hold Astra Back

For those coming from large language models, where agentic benchmarks keep getting more complex and their workflows keep getting longer, robotics’ definition of “long context” can take some getting used to. Historically, that may simply reflect how short the physical-world workflows available to our models have been.

SenseNova finds that increasing the action-step budget to as much as 10× the standard allowance continues to improve Astra’s success rate on many tasks. The LIBERO suites and SIMPLE, for example, approach saturation, while DexJoCo and VLN-CE reach approximately 90%.[1]

:::figure 5

In my own earlier RoboDojo evaluations, Astra also showed a pronounced tendency to explore and retry. Some episodes failed by timing out within the standard step limit. Watching their full execution, however, revealed that the model was still adjusting its strategy, repositioning objects, or trying to reestablish a grasp. This suggests that a fixed, short evaluation budget may underestimate the potential of this kind of agentic policy.

### 1.3 A Larger Evaluation Budget Does Not Solve Everything

Of course, relaxing the budget indefinitely does not make every problem disappear. SenseNova’s failure analysis can be summarized as follows:

| Limitation | How it appears in the evaluation | Possible directions |
| --- | --- | --- |
| ICL transfer | Acquired knowledge is highly task-specific; benefits diminish on tasks outside its coverage. | Broader coverage through more general physical pretraining. |
| Physical verification | An object appears inserted, hooked, or in contact, but the physical success condition is not met. | Physical-state estimation, contact feedback, and reliable verifiers. |
| Consequential actions | Recovery is difficult after spilling, dropping an object, or otherwise destroying a prerequisite. | Risk-sensitive exploration, potentially aided by world models, and recovery policies. |
| Long-horizon progress | Later actions undo subtasks that have already been completed. | Belief and progress tracking. |
| Time and cost | Large token consumption, lengthy reasoning, and repeated attempts. | More efficient inference and interaction paradigms. |

:::figure 6

The figure shows several cases that still fail despite ICL and a generous interaction budget.

SenseNova attributes failures in insertion and assembly interactions to Astra’s limitations in precise physical manipulation. This also raises the question of whether the evaluation supplies enough contact information. Contemporary studies report substantial improvements in insertion success with tactile feedback, and show that its representation also affects performance. **These results suggest that the sensory interface may constrain how well the model can use its capabilities; they do not establish that Astra saw substantial tactile data during pretraining.**

:::figure 7

Another category of failure involves tasks in which spilling or dropping something destroys prerequisites and makes recovery difficult. One possible direction is to encourage the model to “look before it leaps” in these situations: use a world model’s next-state predictions to choose a lower-risk path, for example, or use more carefully constructed pairs of counterfactual data to post-train policies for high-risk situations.

## 2 From Grippers to Dexterous Hands: Where General-Purpose Control Breaks Down

*Galbot: A general-purpose model as a control policy across six embodied domains, different control interfaces, and precise physical manipulation.*

The demonstrations that first had everyone picking their jaws up off the floor were mostly robot-arm tasks with grippers. Galbot’s study tests Astra’s actual performance across a wider range of embodiments. The results fit the intuition: outside gripper manipulation and navigation, contact-rich tasks with more degrees of freedom and a greater need for finger coordination still exceed Astra’s current plug-and-play control capabilities. For those tasks, the general-purpose model needs help from low-level control priors.

### 2.1 Capability Landscape

Galbot evaluates six main domains. Its Direct policy corresponds to the Direct Policy defined above. Its Hybrid policy is an instance of the RFM-Assisted approach: Astra reviews actions proposed by π0.5, monitors execution, and intervenes directly to adjust the proposed policy when necessary.

| Domain | Main result | Insight |
| --- | --- | --- |
| Gripper Manipulation | RoboDojo: Hybrid 48%, Direct 26%. | Policy assistance improves contact-sensitive, long-horizon manipulation. |
| Dexterous Manipulation | Mean score: Hybrid 61.6, Direct 16.6. | Coordinating finger contacts is a clear bottleneck. |
| Mobile Manipulation | RoboCasa: Hybrid 38.7%, Direct 33.3%. | Hybrid helps overall, but not on every task. |
| Navigation | RxR 92%, HM3D 82%. | Strong semantic navigation, though search paths can be inefficient. |
| Locomotion | None of five consecutive attempts on a single obstacle course reached the finish. | Dense body-motion references remain unreliable. |
| Humanoid Loco-Manipulation | Exceeds the best comparison baseline on 13 of 30 HumanoidBench tasks. | High-level decisions can complement existing whole-body controllers. |

### 2.2 Dexterity: High-Level Error Correction Cannot Replace Fine Contact Control

:::figure 8

In Galbot’s dexterous-manipulation evaluation, the RFM-Assisted policy—called Hybrid in the paper—performs best overall. The authors also find that Astra usually makes only limited revisions to π0.5’s proposed actions. Approximately 88% of executed steps come from the unmodified π0.5 policy, with Astra correcting only the remaining 12%. A small amount of intervention at the policy level can therefore yield substantial benefits, while learned control priors still supply most of the low-level motion.[2]

I suspect that the gap between grippers and high-degree-of-freedom dexterous hands comes partly from uneven data coverage, and perhaps also from fundamental differences between their action spaces. Gripper control can largely be abstracted into an EEF trajectory plus opening and closing. Dexterous manipulation must additionally maintain support during continuous motion, shift contact points, and coordinate finger poses and forces. **These capabilities may still require broader data coverage during pretraining and dedicated post-training.**

### 2.3 The Long-Horizon and Generalization Advantages of General-Purpose Models

:::figure 9

Astra’s RoboCasa365 results look very much like what we have come to expect from general-purpose models. On Composite Unseen tasks, Astra’s Direct Policy reaches 56%, compared with 36% for the RFM-Assisted policy and 4% for standalone π0.5.[2] This is easy to understand in light of earlier experience. π0.5 depends heavily on post-training, and individual cases suggest that it can follow learned trajectories rather mechanically. General-purpose models, by contrast, have accumulated extensive unsupervised pretraining and substantial long-horizon agentic RL, giving them a strong disposition to explore—as the trajectories from my own experiments below also illustrate. Planning and executing long tasks is likewise a strength of general-purpose models trained with contextual histories of exploration.

On the same benchmark, Long-WAM [11] also builds a fast-and-slow system incorporating GPT-6 Astra. The authors find that adding Astra produces a further, substantial improvement in every split. They similarly observe that **Astra is particularly good at recovery and correction during long tasks**.

:::figure 10

## 3 Anatomy of an Agentic Robot Policy: What Actually Matters?

*Astranomy: A systematic ablation study on RoboLab.*

This study presents a particularly detailed and systematic set of ablations by NVIDIA researchers on RoboLab. It tests how Astra performs as a general-purpose model under different control interfaces, different amounts of context history, and different textual descriptions of embodiment and perception supplied in the prompt.

For me, one central conclusion is that **an agentic setup with ample textual history of exploration, together with detailed embodiment and perception information, is currently the strongest option**.

### 3.1 Action Representation: EEF Beats Joint Positions

:::figure 11

Astranomy carefully compares EEF and joint-position representations under both Direct and Agentic policies. For Direct Policy, EEF representations clearly outperform joint positions.[3]

There are several possible explanations. EEF targets describe end-effector goals in task space, which makes them easier to share across robot embodiments. General-purpose VLMs have also learned a great deal about position and orientation through visual, spatial, and geometric reasoning tasks. Asking a model to predict an EEF target may fit those priors better than asking it to predict a robot-specific joint configuration.

Moreover, **EEF actions transfer part of the kinematic solving and constraint satisfaction to the robot controller**. The comparison therefore measures more than the model’s ability to predict two kinds of numbers: it also reflects how each control interface decomposes the task’s difficulty.

Under Agentic Policy, the difference between EEF and joint targets becomes much less pronounced. Perhaps, in a framework built around an agent skilled at coding, the harness uses code to handle some of the kinematic solving, achieving an effect similar to “outsourcing” it to the controller.

### 3.2 History: Interaction History Is Essential for an Agent

:::figure 12

:::figure 13

The figures compare a current frame with a short observation history under Direct Policy, and different ways of retaining textual and visual history under Agentic Policy.[3]

They reveal two distinct levels of memory:

- **Short-term observation history** is closer to state estimation. It helps the model understand motion direction, the outcomes of recent actions, and changes to objects.
- **Long-term interaction history** includes earlier actions, plans, decisions, and attempts. It lets the agent know what it has already done and why it should change its strategy next.

I have long wondered why conventional System-1 VLAs such as π0.5 are usually trained around the current state or a short video window, rather than a full interaction history. For long-horizon embodied tasks, history is more than extra visual observations: it is a crucial record of action intent, failed attempts, and task progress. Context management and compaction, already widely used by coding agents, may deserve a place in robot-policy training as well.

The results show that action/feedback-level memory and agentic context are richer than short-term frame stacking. A closer look at the ablations reveals the outsized role of textual history. Early VLAs prompted a recurring question: were they really making the intended use of their language backbones? With Astra acting as a robot policy, the answer is much clearer. **Textual context matters enormously.**

### 3.3 The Harness Is Part of the Policy

Beyond retaining history in the harness, supplying concrete descriptions of the robot’s embodiment and camera geometry in the prompt can greatly improve Direct Policy success rates.[3] Without knowing the end-effector coordinate conventions, camera extrinsics, or gripper geometry, a model may be unable to translate strong spatial understanding into correct control commands.

:::figure 14

:::figure 15

I suspect this is directly related to the training data. To make a VLM as general as possible, one would expect pretraining to take in data voraciously, across embodiments and sources—egocentric footage, real robots, and simulation alike. A VLM also has a substantial language component and is trained on large text corpora. When constructing embodied training data from these varied sources, it is natural to include labels describing the embodiment and camera geometry. Providing the same information at inference time may therefore do more than help the model apply the spatial understanding gained through multimodal training; it may also better match the structure of its training data.

### 3.4 Python Tools Barely Improve Success Rates

The authors give Astra tools for basic mathematical computation, image cropping, camera-geometry calculations, triangulation, inverse kinematics, and persistent notes. All 150 episodes in the tools-enabled evaluation execute Python and geometric computations, averaging approximately 19.7 tool calls per episode. Yet the overall improvement is small: from 86.0% without tools to 88.0% with them.[3]

These tools do not supply information beyond what can already be extracted from the available fixed-view images. They cannot, for example, change the viewing angle or provide detailed physical-contact or tactile feedback; they merely reprocess the existing images. Astra’s native image understanding may already be good enough that these tools offer little marginal benefit.

More promising tools to study may be those that genuinely change what the agent knows or the state of its environment: active perception, physical verification, safe exploration, and so on.

### 3.5 From CaP to Agentic Robotics

Discussion of agentic robotics has gathered momentum over the past few months. In *Claude plays robotics* [15], Anthropic systematically compares interfaces for direct control, code-based control, supervision of pretrained policies, and RL. Its code-based control setup recalls the Code as Policies (CaP) line of work.

But compared with CaP [17] and its successor CaP-X [18], which focus on generating executable control programs at a relatively coarse interaction granularity, modern agentic robotics places greater emphasis on repeatedly receiving feedback during execution, maintaining a history of decisions, and continually revising the policy that follows.

Before Astra’s release, work such as VLA-as-Tools [19], Harness VLA [20], and VoLoAgent [21] was already exploring RFM-Assisted policies. These systems combined the agentic capabilities of System-2 VLMs with System-1 models such as VLAs to tackle long-horizon, contact-rich embodied tasks. In my reading, the VLMs of that period had not yet received enough embodied training data, limiting their role to high-level planning and monitoring rather than direct control. Astra, by contrast, clearly combines long-horizon agentic planning and trial and error with the ability to step in and revise the control policy whenever needed. It raises an irresistible question: if cost and real-time execution were solved, would we still need the System-1 layer?

## 4 Beyond Success Rates: What Robot Rollouts Reveal About Generalization

**The patterns of behavior in actual rollouts deserve attention alongside benchmark scores.** In our preliminary evaluation of Astra as a policy in RoboDojo simulation, some successful trajectories use manipulation strategies that differ from conventional demonstrations. Rather than simply reproducing familiar imitation-learning trajectories, the model can complete tasks through other reasonable and effective approaches. This **behavioral diversity and creativity beyond existing demonstrations** may suggest that the abstract world knowledge and compositional generalization acquired through large-scale pretraining allow a general-purpose model’s physical-world decisions to reach beyond the behavioral distribution of a particular robot dataset. By comparison, VLAs such as π0.5 learn their policies more directly from robot-action data. These observations reveal a form of potential that task success rates alone struggle to capture: **general-purpose models may learn not only how to complete a task, but also how to discover ways of completing it that differ from existing demonstrations.**

:::video-cases
:::

## 5 The World Does Not Pause: Reasoning Under Physical Time Constraints

*Latency, asynchronous reasoning, and the limits of acting in an environment that keeps running.*

General-purpose models exhibit strong embodied decision-making capabilities in simulation, but their interaction paradigm still rests on the assumption that the world can wait while the model thinks.

| Study | Evidence | Implication |
| --- | --- | --- |
| SenseNova [1] | LIBERO-Ultra-Long consumes approximately 9 million tokens and nearly 2 hours; with an extended budget, RoboDojo averages more than 3 hours per episode. | Higher success rates can carry an enormous computational cost. |
| Galbot [2] | The final 30-second locomotion run requires 250 synchronous calls, with an average inference time of 39.86 seconds per call. | Thirty seconds of simulated physical motion can entail hours of wall-clock inference. |
| Astranomy [3] | In successful episodes, Direct EEF averages 18.56 seconds per call; inference accounts for approximately 97% of estimated total execution time. | The agent spends most of its wall-clock time waiting for the next action chunk. |

Rethinking some of our interaction abstractions may help alleviate the real-time constraint, even at the inference speeds of today’s very capable models.

:::figure 16

Several lines of research are already exploring this direction.

- **ARC: Decoupling asynchronous reasoning from control.** ARC uses a background VLM to update an action-grounded reasoning trace. The low-level policy executes actions at 15 Hz and consumes the latest valid trace; in an example rollout, reasoning updates at approximately 1 Hz. An external VLM first generates causal reasoning traces aligned with specific actions in robot demonstrations. These traces describe the current state, action intent, expected consequences, and behaviors to avoid. RFMs such as π0.5 and Cosmos3-Nano-Policy are then trained to use them. At deployment, ARC separates the background VLM’s low-frequency reasoning from the RFM’s high-frequency action execution: the VLM updates its reasoning trace asynchronously while the control policy continues to generate actions from the latest valid reasoning. This offers one way to mitigate inference latency.[5]
- **Gemini Robotics ER 2: Bidirectional streaming.** Google explicitly describes receiving video, audio, or text through a bidirectional streaming endpoint in the Gemini Live API, with VLAs and robot APIs invoked as tools. This comes close to a product-level paradigm for agentic physical interaction. Bidirectional API streaming, however, does not automatically imply that observation, reasoning, and action are three simultaneously autoregressive streams inside the model.[22]
- **Long-WAM: Long histories, future prediction, and real-time action execution.** From the world-action-model perspective, Long-WAM seeks to retain longer observation histories and future-prediction capabilities while meeting the low-latency requirements of real-robot control. It combines a streaming VAE, asynchronous action-chunk execution, and inference optimizations so that the robot can generate subsequent actions while executing the current ones. Its optimized configuration achieves a model inference latency of 107.4 ms per action chunk on an RTX 5090 with a 2.4-second history window; a 19.2-second history requires approximately 341 ms.[11] **Long-term temporal memory, future prediction, and real-time control need not be at odds, but at present they require coordinated design across model training and the inference system.**
- **Multi-Stream LLMs and the Engagement Process: A more complete unification of model architecture and interaction.** Multi-Stream LLMs investigate how multiple input and output streams can evolve in parallel within a single model forward pass.[23] The Engagement Process (EP) redefines physical interaction as asynchronous observation and action events on a shared timeline.[24] The two ideas fit naturally together: EP defines the temporal semantics of interaction with the environment, while a multi-stream architecture learns to process information and produce outputs under those semantics.

What if robot control were no longer expressed as a strictly sequential Observation → Reasoning → Action loop? Could continuously arriving observations, lower-frequency reasoning, and high-frequency actions share a physical timeline, preserving both a large model’s long-horizon reasoning and the responsiveness that robot control requires?<br />Taking this further, **perhaps these events at different rates could be trained jointly within a shared causal network**, so that the model learns not only what to do next, but also when to observe, when to think again, and when timely intervention is essential.

## 6 Converging Paths: Will VLMs and VLAs Meet in the Middle?

The intersection of textual context history, world models, and agentic control deserves close attention.

The VLA used in most of the evaluations discussed here is the open-source π0.5. Both the individual cases and the aggregate results suggest heavy reliance on post-training, with behavior sometimes so rigid that it looks overfit to a particular dataset. Starting with π0.6-MEM, the π family has introduced both short-term and long-term memory, with substantial improvements in generality and long-horizon performance.[4][12]

VLMs started out strong in language understanding, long-context reasoning, and agentic interaction; they are now beginning to generate robot actions directly. VLAs and WAMs initially focused more on learning observation-to-action mappings from robot trajectories; their designs now increasingly incorporate long-term memory, semantic reasoning, and future-state prediction.

**The importance of history recurs across these studies:**

- Astranomy’s ablations show that textual interaction context containing past plans, actions, and feedback can substantially improve Astra’s long-horizon performance as an agentic policy.[3] This closely resembles coding agents’ dependence on full interaction histories and context management.
- Approaching the problem from the other direction, Physical Intelligence introduces short-term video memory and long-term textual memory in π0.6-MEM. The former preserves motion and visual changes over the most recent seconds; the latter summarizes task stages, completed actions, and important past events in natural language.[4] The subsequent π0.7 retains MEM-style historical visual encoding and lets its high-level policy use past subtask information when making decisions.[12]
- Long-WAM supplies another piece of evidence from the world-action-model perspective: history must not merely be retained; suitable temporal-modeling training is needed to turn it into useful control information. Autoregressive video pretraining, prediction conditioned on long histories, and future-latent modeling enable the WAM to use recent physical evolution to predict and generate actions.[11] Its focus on continuous visual history over seconds complements the semantic memory of longer-term task progress and interaction experience emphasized by Astra and MEM. These are two complementary timescales.

**Reasoning is also becoming a shared research focus of the two approaches.** By generating causal reasoning supervision aligned with actions, ARC teaches VLAs and WAMs originally trained primarily on robot trajectories to use linguistic reasoning to improve control.[5] π0.7 allows execution to be steered through high-level language subtasks, episode metadata describing execution quality, speed, and strategy, and visual goals generated by a world model.[12] These capabilities still do not amount to the full agentic exploration exhibited by Astra. They do, however, go beyond the conventional policy that predicts the next action chunk from the current observation alone.

Taken together, these developments suggest that context history—or, more broadly, memory—may be the crucial link that lets reasoning and action form a true closed loop.
