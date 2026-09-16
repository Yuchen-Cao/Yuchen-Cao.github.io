---
title: Still Clumsy, but Already Finding a Way: A Spark of Life in GPT-6's Robot Trajectories
date: 2026-09-16
lang: en
translationKey: robodojo-gpt6-trajectories
description: From correcting cup-uncovering order and aligning a coin to folding clothes with both hands and flipping a number, a look at the moments when GPT-6's robot trajectories start to show resourcefulness before dexterity.
tags: Agents, Embodied Intelligence, Physical AI
featured: false
---

Lately, the embodied AI community has been talking about a major improvement in GPT-6's spatial understanding. Earlier this week, Galbot released some pilot studies showing strong results with GPT-6's help on RoboDojo, a manipulation benchmark that has stumped countless VLAs. Yesterday, curiosity got the better of me. I connected GPT-6 in Codex to RoboDojo and tried a few combinations: letting π0.5 run on its own, letting GPT-6 take over and correct π0.5 along the way, and removing the VLA entirely so that GPT-6 operated independently through the control interface. For π0.5, I used a 15/50-step action selection setting.

I originally wanted to see which setup performed better. But once I watched the trajectories from my own runs, I realized the fun part was this: **GPT-6 goes about things in a remarkably different way from a VLA.**

On September 16—today—RoboDojo released its official GPT-6-Astra evaluation: 42 simulation tasks, 50 episodes per task, and 2,100 trials in total. Its average Score was 28.97, with an average success rate of 22.48%, putting it at the top of the leaderboard at the time. Still some distance from the picture in my head of “connect a smart brain to a robot arm and watch it crush everything,” haha. [Official evaluation report](https://robodojo-benchmark.com/report/gpt-6-astra-eval)

But the individual trajectories are more interesting than the leaderboard scores.

Below are a few clips from the simulation experiments I ran. Their system configuration differs from the official evaluation: I used the Codex wrapper rather than the native GPT-6 API, for cost reasons in my personal tests. These examples are simply a way to observe specific behaviors. The time shown in the replays is simulation time, too; it cannot be read as the model's total time spent thinking and acting. GPT-6's reasoning is still slow and lengthy—careful—so a few dozen seconds passing in the simulation may represent tens of minutes of model assessment and action correction, lol.

A VLA like π0.5 has, after all, been fine-tuned on these tasks, and its movements are smooth. Reach out, approach, grip, lift, carry it over… It looks like muscle memory built through many repetitions.

But what happens when the grasp comes up empty? What if the object is facing the wrong way? π0.5 often keeps going through the original motion: waving an empty arm around after a missed grasp, pouring air from its left hand into its right, lowering a coin that is not aligned with the slot… There is little effective recovery that feels like it has been “thought through.”

First, take the task of covering blocks.
The robot must cover three colored blocks with cups, one by one from left to right, remember their colors, and then uncover them in the order red, green, blue. Once the cups are on, the colors temporarily disappear from view. Deciding which one to uncover next takes memory—a capability we have long since grown used to in LLMs.

In one trajectory with GPT-6 and π0.5 sharing control, the initial covering sequence was complete, but the VLA was about to uncover green first. The movement itself looked perfectly natural; a moment's thought made it clear that the order was wrong. GPT-6 really did act like a smart brain here. It intervened, lifting and adjusting the left hand so that it approached the cup covering the red block. On the next round, the VLA's muscle memory picked up from there and went for red first. It then continued through the rest of the task and ultimately received a success verdict.

In this trajectory, π0.5 still handled the practiced grasping and carrying. At the point where things were about to go wrong, the LLM stepped in to correct the direction. Between the video's long stretches of continuous motion sits a brief correction, like someone gently nudging the arm of a skilled worker who has started going through the motions while half asleep.

![Covering and uncovering blocks: GPT-6 corrects the order, with the takeover visible around 11 seconds](/assets/videos/robodojo-gpt6-trajectories/cover_blocks_gpt6_mixed.mp4)

*Cup-covering example: watch the takeover around 11 seconds and the subsequent move toward the cup covering the red block.*

The coin-depositing task was similar. π0.5 had already picked up the coin, carried it over, passed it between hands, and arrived above the piggy bank. With just the final step to go, it was about to lower the coin and let go. But the coin and the slot were not yet aligned.

GPT-6 took over and first adjusted the target laterally over five steps: −10 mm along X and +15 mm along Y. It then noticed it had gone too far and corrected back over three steps: X +1 mm, Y −6 mm. After that, it returned control to π0.5 to lower the coin, release it, and return home. This episode succeeded after 201 control steps.

Trial and error is what GPT-6 does best—it even corrects its own corrections. If the first judgment is not quite right, take another look and move a little more. Being “almost there” in the physical world finally gets to inform the next action. That willingness to explore reminds me of Sutton's often-mentioned “small agent, big world” idea.

![Depositing a coin: GPT-6 aligns it with the slot, then hands control back to π0.5](/assets/videos/robodojo-gpt6-trajectories/deposit_coin_gpt6_mixed.mp4)

*Coin-depositing example: watch the two small adjustments around 6.5 seconds, followed by π0.5 completing the deposit.*

Of course, recovery attempts do not always succeed. On the same coin task, GPT-6 alone failed to pick up the coin and eventually timed out. In another run with 5.6 Sol sharing control, empty grasps, drops, and retries kept recurring. Even after eight takeovers totaling 40 steps, it exhausted the 300-step budget. The successful GPT-6-plus-VLA run also benefited from the initial coin pickup going smoothly. So perhaps GPT-6's contact-rich manipulation capabilities have not yet been trained to the same level—having a motion-control model assist it may still be the better option for now.

Many movements from GPT-6 alone do look a little clumsy and far from fluid: it tests positions bit by bit, adjusts angles little by little, and sometimes reaches the right neighborhood only to struggle endlessly with the grasp. Yet there are moments that make you sit up. It seems quite clever, and rather good at putting both hands to work at once. Humans do not seem quite as good at that by comparison, and VLAs, learning to imitate humans, also tend to prefer doing things one hand at a time.

Take this clothes-folding example.

Facing a spread-out garment, it approaches both sleeve ends at once and tries to grasp them. It folds one sleeve inward, then deals with the other. Next, its two hands grasp opposite ends of the bottom hem, lift together, fold it upward, set it down, release, and return home. The episode ultimately passed the task check. Notice its attempts to move both hands together.

![GPT-6 folding clothes on its own: both hands approach the sleeves and work together to fold up the bottom hem](/assets/videos/robodojo-gpt6-trajectories/fold_clothes_random_gpt6_native.mp4)

*Clothes-folding example: the two-handed approach at the beginning, and both hands lifting the bottom hem around 5–7 seconds.*

Another example, arranging numbers in a randomized scene, shows even more striking coordination between its two hands and its “brain.” The left and right hands each take a number appropriate to the ordering, one lower and one higher. Along the way, it temporarily puts pieces down, switches hands, and continues arranging them until the task is complete. Its route does not follow π0.5's fixed, human-like habit of working from left to right and placing one number at a time with one hand.

![Arranging numbers in a randomized scene: carrying with both hands, temporarily putting pieces down, and switching hands](/assets/videos/robodojo-gpt6-trajectories/arrange_number_random_gpt6_native.mp4)

*Randomized number-arranging example: notice how it uses both hands at once and eventually completes the task.*

A failed number-arranging trajectory feels even more alive.

The number is facing the wrong way, so it takes the “2” to an empty patch of the table and tries to flip it over. In the middle comes a movement with something of a toss to it: it looks as though it gives the number a little throw, lets it flip and land back on the table, and then picks it up again to position it. It does not stick to the more usual logic of holding securely, moving, and setting down. It is almost as if it understands a basic rule of the physical world: you can give something a toss to turn it over. This approach may not be safe, but it looks creative. After watching so many VLA movements, it is a little revelation: oh, you can try that too. It feels like a child fiddling with a toy that just will not sit the right way up, turning it this way and that before suddenly trying something a little risky. You worry it will mess around and break something, yet cannot help finding it entertaining—so it can explore this kind of solution too.

In the end, though, it still timed out. On a benchmark, you would not see a full 1 for success.

But if you watch the trajectory, it is hard to put this failure in the same category as a VLA that misses a grasp and then keeps executing the rest of the sequence with an empty hand.

![GPT-6 arranging numbers on its own: repeated flipping, releasing, and regrasping, ending in a timeout](/assets/videos/robodojo-gpt6-trajectories/arrange_number_gpt6_native.mp4)

*Number-arranging example: roughly 16–34 seconds covers the attempts to flip and regrasp the “2”; the episode still ends in a timeout.*

That is probably what I mean by a “spark of life.” It gives me hope. It is still a clever little child who has just been given a body it does not quite know how to use. Its hands are not very nimble yet, but its head is full of mischievous ideas. It can frustrate you enough to want to arrange everything for it, and still make you keep watching to find out what it will try next.

This feeling reminds me of the discussions about “emergence” in LLMs a few years ago.

When evaluation looks only at whether the final answer is correct, many intermediate changes can disappear. A system can go from having no idea what to do, to heading in the right direction with occasional mistakes, to completing the task reliably—while its score stays flat on the floor for a long time, then suddenly jumps after crossing a threshold. The 2023 paper *Are Emergent Abilities of Large Language Models a Mirage?* discussed how some seemingly sudden abilities—emergence—may be related to nonlinear or discontinuous evaluation metrics. Measurement shapes how we understand the actual path of progress. [Paper](https://arxiv.org/abs/2304.15004)

In embodied AI, there may be even more transitional states worth noticing. It spots an ordering mistake but cannot correct it in time. It knows something needs flipping but cannot hold it securely. It has moved an object to the right area but is still just short of alignment. These states remain some distance from “success,” yet they give me more hope than earlier attempts that struggled to generalize.

RoboDojo already has process rewards, and its official Score is not simply a binary measure of success or failure. But aggregation inevitably compresses information, whether it starts from process scores or final success rates. A targeted recovery, a different division of labor between two hands, or a route replanned after a failure is hard to see in a total score. [Scoring explanation](https://robodojo-benchmark.com/report/gpt-6-astra-eval#results)

Perhaps, alongside success rates, we should keep asking: did it notice the mistake? Did the recovery attempt make even a little progress? Can it carry what it has learned over to different randomized states and tasks—can it generalize? And how often do those interesting movements appear across repeated experiments?

As for how much GPT-6 really understands about the physical world, I still do not know.
These examples simply make me feel that, after taking in a great deal of data, GPT-6 has accumulated some spatial knowledge and bits of physical intuition that it can use to act.

Of course, we should remain cautiously optimistic. Between the evidence we have now and reliable performance across all these tasks lie plenty of gaps: contact, friction, force, precision, and latency. RoboDojo's official report still lists physical commonsense as a bottleneck, especially contact dynamics and precise manipulation. The current observations are not enough to establish that “it has already acquired reliable physical commonsense.” [Official analysis](https://robodojo-benchmark.com/report/gpt-6-astra-eval#finding-1)

I look forward to seeing the scores keep rising. Perhaps one day robots will suddenly become useful, and we will once again say that intelligence has “emerged.”

When we look back then, perhaps the early signs will have been there all along, in trajectories like these.
