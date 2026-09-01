---
title: Embodied Intelligence Needs Its Own SWE-Bench
date: 2026-08-18
lang: en
translationKey: embodied-agent-benchmark-part-1
description: A view from Coding Agentic LLMs on interaction loops, harnesses, long-term dependencies, and why embodied intelligence needs its own SWE-Bench.
tags: Agents, Embodied Intelligence, Benchmarks
featured: true
---

# Embodied Intelligence Needs Its Own SWE-Bench

> Thoughts from an LLM researcher who wandered into building embodied brains

I entered embodied intelligence more or less by accident, through my work on coding LLMs. Over the past year, I have felt just how complex embodied systems are: models at different levels mesh together like interlocking gears. I have also realized that what I do is not quite the “embodied intelligence” most people mean in casual conversation. Whenever we LLM-adjacent outsiders talk with researchers who come from a more traditional embodied background, the gap is enormous. It is hard to put that feeling into words, so I am using a rare free moment to write down some personal thoughts from the past year.

### After CaP-X attracted widespread attention

Coming from the perspective of coding-oriented agentic LLMs, I did not find the paradigm in [CaP-X](https://arxiv.org/abs/2603.22435) especially unfamiliar when I first saw it. We are already used to coding agents and agentic RL. The core logic of this kind of Code-as-Policy work is deeply familiar:

Perceive, think, act, read feedback from the environment—the next perception—update your understanding of the environment—the next round of thought—and decide what to do next. Failure is not the end of an episode; it is input to the next round of reasoning.

This differs from the instinct inherited from autonomous driving. There, the default assumption is that trial and error in the physical world is expensive, so a system should gather enough information, act cautiously, and maximize its chance of succeeding on the first attempt. In the digital world, or in a code-based testbed, trial and error is cheap. The setting naturally favors an interaction pattern in which the agent experiments, updates its belief, and becomes more familiar with the environment inside its context.

At an abstract level, CaP-X does not depart from this agentic-coding path. The model generates a Python program, calls perception and control primitives, runs the program, reads structured feedback, and improves its success rate through multi-turn interaction, visual differencing, skill composition, and retries. CaP-X did not invent the agent loop. Its contribution was to bring the working style of modern coding agents into robot control, then systematically study how abstraction, interaction, and perceptual grounding affect performance.

That transfer is undeniably valuable. An LLM researcher accustomed to agentic loops in SWE may naturally assume the same pattern should work in embodied settings, but a paradigm that works in software does not automatically survive contact with the physical world. The interactions we take for granted in SWE—and the many coding harnesses that all share a similar underlying design—leave us with a question: when we carry the logic of digital-world agents into the physical world, what principle should govern the way the pieces fit together?

At the most basic level, is an embodied agent fundamentally a model that writes a longer piece of control code, or a model that truly owns the loop of interacting with its environment?

My intuition strongly favors the latter.

### What makes a system agentic is not how many times the model is called, but who owns the interaction loop

Many embodied systems began incorporating large-model agent capabilities quite early. Their workflows look roughly like this:

![How a large model is called inside a predefined workflow](/assets/posts/polaris-bench/predefined-workflow-en.png)

These early systems clearly called the model more than once. But the rules for observing again, updating memory, triggering a replan, or choosing a recovery path after failure were still written by people. The LLM was merely a planning component doing its best to succeed in one shot.

When we talk about agentic coding, we usually assume the model itself decides when to retrieve, edit, or test. A more general sketch of an agentic system looks like this:

![An interaction loop owned by the agent](/assets/posts/polaris-bench/agentic-interaction-loop-en.png)

$$
b_{t+1}=\operatorname{Update}(b_t,o_{t+1},a_t,f_{t+1})
$$

$$
u_{t+1}=\operatorname{Agent}(g,b_{t+1},T)
$$

Here, $b_t$ does not have to be a belief in the strict Bayesian sense. It is simply the model's current working understanding of the environment. $T$ is the set of tools available to the model, and $f_t$ is the feedback returned after an action is executed.

Recent embodied research has been moving more explicitly in this direction. [AgenticNav](https://arxiv.org/abs/2606.10577) exposes action, depth, and memory as tools that a VLM can call on demand. [Embodied Agents Take Control](https://arxiv.org/abs/2607.26148) goes further and plugs the mini-SWE-agent harness familiar from software engineering directly into a navigation environment, allowing the model to decide when to observe, how to move, and when to stop.

People are clearly beginning to explore what happens when the model is given ownership of the interaction loop.

### Code can be a tool, but it should not sit at the center of everything

Back to CaP-X. The programs it generates can call SAM3, Molmo, OpenCV, Open3D, inverse kinematics, motion planning, collision detection, and other perception and control primitives. It already integrates a substantial collection of tools.

Yet, contrary to the intuition of moving SWE from the digital world into the physical one, CaP-X places the Python program too close to the center. It treats code as the main control plane for high-level robot behavior. One code–environment turn corresponds to one model call: the model generates a Python program, the environment runs it to completion, and the program may invoke several perception and control primitives along the way. Only after the whole program finishes does the model regain control.

But the physical world does not always behave like a shell script.

Insertion, pouring, wiping, opening a door, or navigating through a crowd can require continuous visual feedback, contact feedback, external events, and safety interrupts. Even when the underlying state appears fixed, the feedback is not necessarily as reproducible or noise-free as code. An action that made sense when it began may no longer be safe or useful three seconds later.

Following the system design of SWE agents, a physical-world embodied agent may be better understood as a generalist that can use many different models as tools:

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

Code remains an important meta-tool in this collection. When predefined tools or skills do not fit, it can synthesize a new skill on the fly or generate a local controller, extending the system's reach. But it should not, by default, replace VLAs, world-action models, navigation systems, and specialized low-level controllers.

Some VLA-as-Tools systems are already advancing in this direction. A high-level VLM handles scene analysis, global planning, and failure recovery, while multiple specialized VLAs execute bounded physical subtasks. During execution, a VLA used as a tool reports progress to the high-level agent, allowing the agent to replan in response to events instead of continuously polling at high frequency.

We have become extremely confident in high-level models born in the digital world. They seem to be striding toward AGI, as if they might take on the Fields Medal tomorrow. Yet what they can do in embodied settings is clearly unworthy of those magnificent digital brains.

![The contrast between high-level LLM capabilities and basic embodied cognition](/assets/posts/polaris-bench/llm-fields-medal-vs-embodied-reality-en.png)

Under this design, we need not only to improve the high-level model's understanding of the physical world, but also to train lower-level models to behave as reliable tools. A VLA tool needs to understand the boundary of an instruction: when to begin, when to finish, when to report failure, how to communicate intermediate progress, and how to exit safely after an interruption.

Rather than treating VLAs as competitors to agentic LLMs, as people often have, I intuitively see them as a crucial class of executors in the future embodied-agent tool ecosystem. The two should be trained together.

[Thea](https://arxiv.org/abs/2608.11246) takes a view similar to ours. It proposes a harness that integrates several kinds of tools, registering VLA, VLN, and manipulation models inside an LLM harness. Like the interactions we built for agentic LLMs earlier this year, it also offers a `load_skill` tool—the equivalent of “read the manual.”

An aside: our tests at the beginning of the year showed that frontier models already generalize remarkably well in agentic settings. With our version of `load_skill`, they could decide for themselves when to read instructions and then follow them. Different models had different habits. OpenAI's GPT-4o at the time liked to plunge in and discover how an unfamiliar tool worked by trying it. DeepMind's Gemini 3.1 preferred to read the manual first and proceed more cautiously. Each had its own energy-efficient exploration strategy. Humans are the same: some people skip every tutorial in a game, while others cannot live without the manual. This generalization probably comes from extensive SWE training. Foundation models have learned quite thoroughly how to surf the digital world through code and workspace tasks.

### Is building the harness enough?

When discussing CaP-X with researchers from embodied-intelligence backgrounds, I often hear a seemingly pragmatic conclusion:

> If agents such as Codex and Claude Code owe much of their capability to the harness, embodied teams only need to build the tools, memory, runtime, verifier, and task workflow. Foundation-model companies can keep improving the model itself.

From a risk-averse perspective, this is reasonable. The progress of coding agents over the past year or two has given many people their first visceral sense of how much a harness matters. Keep the model fixed but give it better tools, clearer context, a more reliable test environment, and a more complete feedback loop, and its capability can change dramatically. In its account of Codex harness engineering, OpenAI likewise emphasized that the hard work increasingly lies in designing environments, feedback loops, tools, and control systems. At the same time, it cautioned that current performance depends heavily on the structure and tools of particular repositories and should not be assumed to generalize automatically. Anyone who built an early harness has probably watched model progress gradually swallow the predefined agent features that once served as crutches.

But can we really assume that the model is interchangeable and that embodied teams need only iterate on the outer harness?

That conclusion confuses two things:

1. a harness can release a capability the model already has;
2. through interaction with a harness, a model can learn a capability it did not have before.

The first improves performance; the second is capability learning itself. A well-designed harness can absolutely make today's model work better immediately. But if every model error can only be addressed by an engineer adding another prompt, fallback, special verifier, or `if` branch outside the model, those failures never become the model's experience.

The system merely gets better at holding the current model upright. The model never learns to walk.

Nor is the model a universal, plug-and-play component. To work well and keep improving, it must be closely adapted to—and co-trained with—its harness and environment. The harness determines what the model can see, what it can invoke, and how feedback reaches it. The model determines whether it can actually understand that feedback and form an effective strategy over a long interaction.

In the physical world, this coupling only grows stronger.

An embodied agent must learn more than the JSON schema of a tool. It must learn how tools interact with the physical world:

- when to call depth rather than keep guessing from RGB;
- when to let a VLA continue;
- when to cancel or preempt an action already in progress;
- how to understand and adapt to perception error;
- how to calibrate trust based on a tool's success rate;
- how to integrate asynchronous progress events, visual changes, and safety interrupts into its current belief;
- how to judge whether exploration is worth the time, energy, and risk it consumes.

We can temporarily write these rules into prompts and workflows. But if we want a model to generalize to new tasks, environments, and tools, it will eventually have to learn them through real interaction.

I think harnesses usually begin with one of two purposes: as a crutch, or as a training ground.

A crutch compensates for the limitations of an existing high-level model. Current systems, including CaP-X and the tool-rich [Thea](https://arxiv.org/abs/2608.11246), largely work this way. Around the model's current weaknesses, they accumulate special prompts, task-specific workflows, hand-written recovery branches, observation formats that only a particular model understands, fallbacks that silently take over when the model makes a mistake, and tool combinations designed for a handful of benchmark cases. They resemble the manually defined agent workflows of around 2024.

This kind of harness can be extremely effective for today's demos and products. It has real engineering value and may be unavoidable when turning research into something deployable.

But if the experience it generates is never used for training, the model's ability will not grow as the system is used. Change the model and many rules may need retuning. Change the task and the old workflow may no longer apply. Move into an open environment and more patches pile up. Different models have different preferences and therefore need help in different places: some are conservative, some aggressive, and each naturally fits a different harness style.

The harness helps the model complete the task without helping it absorb the capability required to complete it. Put more provocatively: this is not a road to AGI.

The other kind—necessary, in my view, yet currently undervalued because its results are less immediately visible—is a training ground: a harness built as learning infrastructure. Anyone who works on coding RL will recognize the idea. Such a harness provides:

- a general and stable observation/action interface;
- an extensible tool space;
- verifiable task objectives;
- semantically meaningful execution feedback;
- recordable long-horizon trajectories;
- localization of the stage at which a failure occurred;
- uncertainty and safety signals;
- a data loop for SFT, RL, and distillation.

It helps the model work today, then turns today's failures into tomorrow's training data so that the next model needs less external compensation. Codex, Claude Code, DSH, and the other systems we use all become part of the foundation-model data flywheel as they are used. People continually supply new training grounds, and the models continue to evolve.

Sutton wrote in [The Bitter Lesson](http://www.incompleteideas.net/IncIdeas/BitterLesson.html):

> We want AI agents that can discover like we can, not which contain what we have discovered.

The lesson for us is that a crutch-style harness—in which the model merely fills a few blanks in a predefined workflow—can be gratifying to engineer and produce quick short-term gains. In the long run, though, we should not be building ever more elaborate manual processes. We should build systems that can discover effective strategies for themselves through search, interaction, and learning.

So I do not think embodied teams should only build a harness. We can start from the general cognitive priors that foundation models keep providing, connect them to an embodied training-ground harness, and let the high- and low-level models adapt to one another's capability boundaries through closed-loop interaction. Both successful and failed trajectories should continuously flow back into training.

I have taken plenty of wrong turns on this problem myself. To find a presentable demo trajectory for a trained model, I once obsessively tuned the tool-calling prompt and spent enormous effort coordinating perception models with a long-horizon agentic model. Move to a different scene and performance collapsed. The satisfaction of one case became the frustration of the next. I think this detour is unavoidable at the present stage; I simply do not think we should be satisfied with it. Looking back, our tool design was also very constrained. We should remember that the capabilities and boundaries of the models used as tools keep changing. Even Thea's approach of predefining which tool owns which scope will not remain sufficient forever.

### The digital world gives us stdout and stderr; the physical world does not

Coding agents developed rapidly not only because GitHub contains so much code, but also because software environments are unusually friendly to agents.

A coding agent can usually inspect file contents and directory structure, read compiler errors and stack traces, and observe `stdout` and `stderr`. Retrying is cheap and results are highly reproducible. All of this feedback lets the model continually revise its understanding of the repository.

The physical world is the opposite: noisy, changing, and uncertain. You cannot step into the same river twice because state drifts over time; and a thousand cameras can produce a thousand different patterns of noise on Hamlet's face. Determinism is affected by many factors, so even the same apparent state and action will not reliably yield the same observation.

When we design SWE tasks, we can let the model retry and debug repeatedly because retries are cheap and feedback is stable. Another crucial advantage is that judging the result is simple: run the program and tests, read `stdout` and `stderr`, update the belief, and roll another action. Physical feedback is much more complicated and may need to expose a daunting amount of state. I am honestly a little overwhelmed by this design space. My instinct remains to design less and let the model adapt—elegant things tend to be simple. Perhaps what we really need is to discover the physical world's equivalents of `stdout` and `stderr`:

```text
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

Because the physical world changes with time, a high-level model cannot go completely deaf for ten seconds the way a coding agent can assume its repository remains static. Nor should it have to wait for a tool to return before thinking again. It needs to keep reasoning while an action runs, cancel or preempt the action when new observations warrant it, respond to safety interrupts, and replan when something important actually changes. Many harnesses, including Codex, let a new request steer a task in progress, but even that happens at turn boundaries and is not nearly real-time enough.

There has been a wave of recent work on streaming LLMs and interactive models, and we are also thinking in this direction. The bottleneck is already visible—and resembles the bottleneck in high-frequency embodied models. Real-time interaction built from frequent chunks or multiple streams makes the KV cache balloon. I hope to write more about this later. High-frequency perception, especially video, seems naturally suited to compression.

A tool call in the physical world is not an instantaneous, synchronous function call. It is a process with duration, during which the environment continues to change. This raises a real modeling question: can we directly reuse the assumptions of coding-oriented agentic LLMs in relatively static environments, or the POMDP formulation used by high-frequency policies where environmental change can be ignored over a short interval?

### Talking past one another about “long horizon”

Embodied-intelligence researchers often call a task long-horizon when it lasts a long time physically or requires many action steps. That makes sense. System-0 and system-1 embodied models interact at very high frequency, so their action sequences can indeed be enormous—far longer than the few hundred turns of a coding agent. And yet my intuition is that many embodied “long-horizon” tasks still resemble a twelve-minute task such as [A Human-in-the-Loop Lifelong Code Generation Framework](https://arxiv.org/abs/2509.18597). In physical time, that is short compared with [Frontier SWE](https://www.frontierswe.com/).

The obvious response is to point to nonstop livestreamed sorting or robot marathons. Those are certainly long in elapsed time. But intuitively, they still do not feel long-horizon in the agentic sense.

People working on LLMs tend to have rather aggressive fantasies about AGI—perhaps because Altman spends so much time lounging around and talking about it. I think we need a more useful definition of *agentic horizon* when we discuss what “long” means.

I want the “long” to refer to the dependency horizon. To put it jokingly: if a few attention sinks plus a streaming window can solve a task perfectly forever, is it really long?

```text
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

GPT helped me sketch the quadrant above as a way to describe long-horizon tasks.

- **Short execution × short dependency:** These are closer to reactive skills: pick-and-place, grasping, single-step VLAs, and visual servoing.
- **Long execution × short dependency:** I call this persistent reactivity: long-duration sorting, continuous locomotion, repetitive factory work, robot marathons—the kinds of tasks showcased in livestreams and competitions. They can resemble stress tests, demanding endurance without requiring the system to remember very far back.
- **Short execution × long dependency:** This quadrant is less intuitive and may contain some tricky cases: a task must finish quickly, yet the system must remember a hidden requirement from the beginning, make a decision based on a much earlier instruction, or follow an instruction after a long delay. These are still forms of long-dependency reasoning.
- **Long execution × long dependency:** For those of us who come from agentic LLMs, this is the most natural meaning of long-horizon agency. It includes SWE, open-ended research agents, and complex household robotics tasks that might replace an entire cleaning shift. Early actions constrain what remains feasible much later.

For people who begin in the upper-right quadrant—long execution × long dependency—the most natural system architecture is to package the reactive competence of the lower-left quadrant as tools, skills, or action primitives. This is precisely the motivation borrowed from SWE agents.

### Balancing immediate accuracy against the long-term value of exploration

It is hard not to notice that embodied-intelligence demos tend to revolve around a few fixed scenes. That is probably another consequence of the physical world being so much harder than the digital one.

In SWE training, we naturally let a model explore. In the physical world, trial and error is much more expensive, so “enter an environment for the first time, look around, and slowly get familiar with it” is rarely an elegant strategy for a single task. In autonomous driving, industrial robotics, and product demos, success rate, latency, path efficiency, and safety rightly take priority.

Existing embodied benchmarks encode that perspective by optimizing one episode at a time:

- exploration creates only immediate cost;
- newly acquired knowledge cannot demonstrate value in later tasks;
- every episode resets;
- the agent never gets to amortize the cost of learning an environment.

But a household robot deployed in the real world will not perform only one task. It may work in the same home for months. If the exploration required to find a power bank the first time makes the next ten retrieval tasks faster, that exploration had real value.

Perhaps future benchmarks should point toward a different objective: teach the model to estimate whether information gained through exploration can amortize its cost across future tasks, instead of punishing a single detour. **One essence of agency is allowing the model to spend an action budget to buy information.**

Of course, until continual learning is properly solved, those of us who work on LLM data cannot confidently claim that we can handle a task spanning such a long period.

### Embodied intelligence needs its own SWE-Bench: define the problem before defining the agent

SWE-Bench gave the coding-agent community a shared language. Different teams can train different models and design different harnesses, but they ultimately answer the same question: can an agent independently understand an unfamiliar repository and, through tool use and feedback from failure, complete a verifiable software-engineering task?

**Embodied intelligence currently lacks an equivalent north star.** We need a verifiable evaluation suite with a genuinely agentic, reasonably long horizon—one that can connect researchers from LLM agents and agentic RL with those from robotics, VLAs, world-action models, and autonomous driving.

As a starting point, we may not need to answer, “What should an embodied-agent harness look like?” We should not prematurely dictate whether the model must use a map, a VLA, a world-action model, code, or a particular memory architecture. A benchmark with real staying power should **specify the problem as much as possible, not prescribe the answer**.

What matters first may simply be to **construct an environment that generates these long-term interaction problems** and to **define a sufficiently reliable way to verify the outcomes**.

If the goal is to advance agentic RL, the first step may not even need a real robot. Exploration, failure, retries, and long-horizon credit assignment all require large numbers of rollouts, while the physical world makes those behaviors expensive, slow, and difficult to reproduce. A pragmatic starting point is therefore to formulate the problem in a high-fidelity simulated environment within the digital world. Which harness or model architecture ultimately solves it—and how those capabilities transfer back into the real physical world—can be the next stage of the problem.
