using System;
using System.Collections;
using System.IO;
using System.Linq;
using Nightfall3.Actors;
using Nightfall3.Combat;
using Nightfall3.Flow;
using UnityEngine;

namespace Nightfall3.Presentation
{
    public sealed class RuntimeQaCapture : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Install()
        {
            var args = Environment.GetCommandLineArgs();
            var index = Array.IndexOf(args, "-qaCapture");
            if (index < 0 || index + 1 >= args.Length) return;
            Application.runInBackground = true;
            var runner = new GameObject("Runtime QA Capture", typeof(RuntimeQaCapture)).GetComponent<RuntimeQaCapture>();
            runner.StartCoroutine(runner.Capture(
                args[index + 1],
                Array.IndexOf(args, "-qaCombat") >= 0,
                Array.IndexOf(args, "-qaFlow") >= 0,
                Array.IndexOf(args, "-qaBoss") >= 0,
                Array.IndexOf(args, "-qaRespawn") >= 0,
                Array.IndexOf(args, "-qaAnimation") >= 0,
                Array.IndexOf(args, "-qaEnemyAnimation") >= 0,
                Array.IndexOf(args, "-qaCovenant") >= 0,
                Array.IndexOf(args, "-qaBossMechanics") >= 0,
                Array.IndexOf(args, "-qaMastery") >= 0,
                Array.IndexOf(args, "-qaRune") >= 0,
                Array.IndexOf(args, "-qaAshfall") >= 0,
                Array.IndexOf(args, "-qaWitness") >= 0,
                Array.IndexOf(args, "-qaElite") >= 0,
                Array.IndexOf(args, "-qaEscort") >= 0,
                Array.IndexOf(args, "-qaRelic") >= 0,
                Array.IndexOf(args, "-qaArchive") >= 0));
        }

        private IEnumerator Capture(string path, bool exerciseCombat, bool exerciseFullFlow, bool exerciseBoss, bool exerciseRespawn, bool exerciseAnimation, bool exerciseEnemyAnimation, bool exerciseCovenant, bool exerciseBossMechanics, bool exerciseMastery, bool exerciseRune, bool exerciseAshfall, bool exerciseWitness, bool exerciseElite, bool exerciseEscort, bool exerciseRelic, bool exerciseArchive)
        {
            var player = FindFirstObjectByType<PlayerController>();
            var flow = FindFirstObjectByType<DemoFlowController>();
            if (exerciseCombat || exerciseFullFlow || exerciseBoss || exerciseRespawn || exerciseAnimation || exerciseEnemyAnimation || exerciseCovenant || exerciseBossMechanics || exerciseMastery || exerciseRune || exerciseAshfall || exerciseWitness || exerciseElite || exerciseEscort || exerciseRelic || exerciseArchive) flow?.Interact();
            var startingEnemies = FindObjectsByType<EnemyController>(FindObjectsSortMode.None);
            var initialEnemies = startingEnemies.Length;
            var initialHealth = startingEnemies.Sum(enemy => enemy.GetComponent<Health>().Current);
            var initialPower = player != null ? player.SpellPower : 0f;
            var initialExperience = player != null ? player.Experience : 0;
            var observedBossPhase2 = false;
            var observedBossPhase3 = false;
            var observedWardRitual = false;
            var observedCovenantChoice = false;
            var observedEchoHunt = false;
            var observedMasteryChoice = false;
            var observedRunePuzzle = false;
            var observedRuneReset = false;
            var attemptedWrongRune = false;
            var observedSanctumDefense = false;
            var observedAshfall = false;
            var observedWitnessDialogue = false;
            var witnessCaptureFrames = 0;
            var observedEliteShield = false;
            var observedEliteShieldBreak = false;
            var eliteCaptureFrames = 0;
            var observedEscort = false;
            var observedEscortStage = 0;
            var escortCaptureFrames = 0;
            var observedArchiveCipher = false;
            var observedArchiveReset = false;
            var attemptedWrongArchive = false;
            var observedArchivePurge = false;
            var observedArchiveCurator = false;
            var observedArchiveSecondJudgment = false;
            var issuedCuratorThresholdDamage = false;
            var archiveCaptureFrames = 0;
            var observedRelicChoice = false;
            var observedReturnPortal = false;
            var relicCaptureFrames = 0;
            var observedRespawn = false;
            if (player != null) player.Respawned += () => observedRespawn = true;
            var issuedPhaseOneDamage = false;
            var issuedPhaseTwoDamage = false;
            var issuedKillingDamage = false;
            var observedDirectionalCleave = false;
            var observedCenterRupture = false;
            var observedConvergence = false;
            var animatedEnemies = startingEnemies.Where(enemy => enemy.GetComponentInChildren<EnemySpriteAnimator>() != null).ToArray();
            var animatedEnemyNames = animatedEnemies.Select(enemy => enemy.Archetype.ToString()).ToArray();
            var observedEnemyStates = new bool[animatedEnemies.Length, 5];
            var frameBudget = exerciseRelic ? 7600 : exerciseBossMechanics ? 6500 : exerciseBoss ? 5800 : exerciseArchive ? 5600 : exerciseEscort ? 4300 : exerciseElite ? 3100 : exerciseWitness ? 2800 : exerciseAshfall ? 2200 : exerciseRune ? 760 : exerciseMastery ? 560 : exerciseCovenant ? 420 : exerciseFullFlow ? 5200 : exerciseEnemyAnimation ? 360 : exerciseAnimation ? 240 : 180;
            for (var frame = 0; frame < frameBudget; frame++)
            {
                if (exerciseAnimation && player != null)
                {
                    if (frame is >= 12 and <= 18) player.transform.position += Vector3.right * 0.08f;
                    if (frame == 30) player.CastArcBurst();
                    if (frame == 72) player.Health.TakeDamage(1f);
                    if (frame == 108) player.Health.TakeDamage(99999f);
                }
                if (exerciseEnemyAnimation && player != null)
                {
                    for (var i = 0; i < animatedEnemies.Length; i++)
                    {
                        var animatedEnemy = animatedEnemies[i];
                        if (animatedEnemy == null) continue;
                        var enemyAnimator = animatedEnemy.GetComponentInChildren<EnemySpriteAnimator>();
                        if (enemyAnimator == null) continue;
                        observedEnemyStates[i, 0] |= enemyAnimator.ObservedIdle;
                        observedEnemyStates[i, 1] |= enemyAnimator.ObservedMove;
                        observedEnemyStates[i, 2] |= enemyAnimator.ObservedAttack;
                        observedEnemyStates[i, 3] |= enemyAnimator.ObservedHit;
                        observedEnemyStates[i, 4] |= enemyAnimator.ObservedDeath;
                        if (frame == 210)
                        {
                            var angle = i * Mathf.PI * 2f / Mathf.Max(1, animatedEnemies.Length);
                            animatedEnemy.transform.position = player.transform.position + new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle)) * 0.8f;
                        }
                        var rearOrigin = animatedEnemy.transform.position + (animatedEnemy.transform.position - player.transform.position).normalized * 2f;
                        if (frame == 250) animatedEnemy.ReceiveHit(1f, rearOrigin, false);
                        if (frame == 286) animatedEnemy.ReceiveHit(99999f, rearOrigin, true);
                    }
                }
                if (exerciseRespawn && frame == 12 && player != null)
                {
                    player.GrantRelic(0.5f, 50);
                    DemoDirector.SpawnLootPickup(player.transform.position + Vector3.right * 8f, player, false);
                }
                if (exerciseRespawn && frame == 24 && player != null) player.Health.TakeDamage(99999f);
                if (exerciseCombat && player != null)
                {
                    if (frame == 25) player.CastArcBurst();
                    if (frame == 70) player.CastStaticField();
                    if (frame == 112) player.CastTeleport();
                    if (frame == 148) player.CastFrozenOrb();
                }
                if (exerciseCovenant && player != null && flow != null)
                {
                    if (frame > 16 && frame % 12 == 0 && flow.PhaseId == "GateFight") KillAllTargets(player.transform.position);
                    if (flow.PhaseId == "CovenantChoice") player.transform.position = new Vector3(-3.6f, 0.05f, 7.2f);
                }
                if ((exerciseFullFlow || exerciseBoss || exerciseBossMechanics || exerciseMastery || exerciseRune || exerciseAshfall || exerciseWitness || exerciseElite || exerciseEscort || exerciseRelic || exerciseArchive) && player != null && flow != null)
                {
                    if (flow.PhaseId == "WardRitual") observedWardRitual = true;
                    if (flow.PhaseId == "EchoHunt")
                    {
                        observedEchoHunt = true;
                        if (flow.RemainingEnemies == 0)
                        {
                            player.transform.position = flow.InteractionTargetPosition;
                            flow.Interact();
                        }
                    }
                    if (flow.PhaseId == "SanctumDefense") observedSanctumDefense = true;
                    if (flow.PhaseId == "AshfallGauntlet")
                    {
                        observedAshfall |= FindFirstObjectByType<AshfallHazard>() != null;
                        player.transform.position = flow.GauntletSafePosition;
                        if (exerciseAshfall && observedAshfall) frame = frameBudget;
                    }
                    if (flow.PhaseId == "WitnessApproach")
                    {
                        player.transform.position = flow.InteractionTargetPosition;
                        flow.Interact();
                    }
                    if (flow.PhaseId == "WitnessDialogue")
                    {
                        observedWitnessDialogue = true;
                        if (exerciseWitness)
                        {
                            if (++witnessCaptureFrames >= 20) frame = frameBudget;
                        }
                        else flow.ChooseDialogue(1);
                    }
                    if (flow.PhaseId == "EliteFight")
                    {
                        var elites = FindObjectsByType<EnemyController>(FindObjectsSortMode.None).Where(enemy => enemy.Archetype == EnemyArchetype.Brute).ToArray();
                        observedEliteShield |= elites.Any(enemy => enemy.WardShielded);
                        observedEliteShieldBreak |= observedEliteShield && elites.Any(enemy => !enemy.WardShielded);
                        if (exerciseElite && observedEliteShield && ++eliteCaptureFrames >= 20) frame = frameBudget;
                    }
                    if (flow.PhaseId == "WardflameEscort")
                    {
                        observedEscort = true;
                        observedEscortStage = Mathf.Max(observedEscortStage, flow.EscortStage);
                        if (flow.RemainingEnemies == 0) player.transform.position = flow.EscortTargetPosition;
                        if (exerciseEscort && flow.EscortStage == 1 && flow.RemainingEnemies > 0 && ++escortCaptureFrames >= 20) frame = frameBudget;
                    }
                    if (flow.PhaseId == "ArchiveCipher")
                    {
                        observedArchiveCipher = true;
                        if (!attemptedWrongArchive)
                        {
                            attemptedWrongArchive = true;
                            player.transform.position = new Vector3(0f, 0.05f, 117f);
                            flow.Interact();
                        }
                        else if (flow.RemainingEnemies == 0)
                        {
                            observedArchiveReset |= flow.ArchiveFailures == 1;
                            player.transform.position = new Vector3(-5f, 0.05f, 114f);
                            flow.Interact();
                        }
                        else if (frame % 12 == 0) KillAllTargets(player.transform.position);
                    }
                    if (flow.PhaseId == "ArchivePurge") observedArchivePurge = true;
                    if (flow.PhaseId == "ArchiveCurator")
                    {
                        observedArchiveCurator = true;
                        var curator = FindObjectsByType<EnemyController>(FindObjectsSortMode.None).FirstOrDefault(enemy => enemy.name.Contains("black-archive-curator"));
                        if (curator != null && !issuedCuratorThresholdDamage)
                        {
                            curator.ReceiveHit(590f, player.transform.position, true);
                            issuedCuratorThresholdDamage = true;
                        }
                        observedArchiveSecondJudgment |= curator != null && curator.WardShielded;
                        if (exerciseArchive && observedArchiveSecondJudgment) player.transform.position = new Vector3(-5.4f, 0.05f, 132f);
                        if (!exerciseArchive && observedArchiveSecondJudgment && frame % 12 == 0) KillAllTargets(player.transform.position);
                        if (exerciseArchive && observedArchiveSecondJudgment && ++archiveCaptureFrames >= 24) frame = frameBudget;
                    }
                    if (flow.PhaseId == "MasteryChoice")
                    {
                        observedMasteryChoice = true;
                        if (!exerciseMastery) flow.SelectMastery(0);
                    }
                    if (flow.PhaseId == "RunePuzzle")
                    {
                        observedRunePuzzle = true;
                        if (!exerciseRune && !attemptedWrongRune)
                        {
                            attemptedWrongRune = true;
                            player.transform.position = new Vector3(-4.25f, 0.05f, 45f);
                            flow.Interact();
                            observedRuneReset = flow.RuneFailures == 1 && flow.RuneProgress == 0;
                        }
                        var solution = new[]
                        {
                            new Vector3(0f, 0.05f, 46.2f),
                            new Vector3(-4.25f, 0.05f, 45f),
                            new Vector3(4.25f, 0.05f, 45f)
                        };
                        var progress = Mathf.Clamp(flow.RuneProgress, 0, 2);
                        player.transform.position = solution[progress];
                        if (!exerciseRune) flow.Interact();
                    }
                    if (flow.PhaseId == "CovenantChoice")
                    {
                        observedCovenantChoice = true;
                        player.transform.position = new Vector3(-5.45f, 0.05f, 8.6f);
                        flow.Interact();
                    }
                    if (frame > 16 && frame % 12 == 0 && flow.PhaseId is "GateFight" or "CovenantTrial" or "CausewayFight" or "EchoHunt" or "WardRitual" or "SanctumDefense" or "EliteFight" or "WardflameEscort" or "ArchivePurge" && !(exerciseElite && flow.PhaseId == "EliteFight") && !(exerciseEscort && flow.PhaseId == "WardflameEscort"))
                        KillAllTargets(player.transform.position);
                    if (flow.PhaseId == "AdvanceCauseway") player.transform.position = new Vector3(0f, 0.05f, 18f);
                    if (flow.PhaseId == "AdvanceEchoHunt") player.transform.position = new Vector3(0f, 0.05f, 27.5f);
                    if (flow.PhaseId == "AdvanceWard") player.transform.position = new Vector3(0f, 0.05f, 45.5f);
                    if (flow.PhaseId == "AdvanceDefense") player.transform.position = new Vector3(0f, 0.05f, 55.5f);
                    if (flow.PhaseId == "AdvanceGauntlet") player.transform.position = new Vector3(0f, 0.05f, 62.5f);
                    if (flow.PhaseId == "AdvanceElite") player.transform.position = new Vector3(0f, 0.05f, 78.5f);
                    if (flow.PhaseId == "ArchiveApproach") player.transform.position = new Vector3(0f, 0.05f, 110.5f);
                    if ((exerciseBoss || exerciseBossMechanics || exerciseRelic) && flow.PhaseId == "BossApproach") player.transform.position = new Vector3(0f, 0.05f, 143.5f);

                    var boss = FindFirstObjectByType<BossController>();
                    if (exerciseBossMechanics && boss != null)
                    {
                        observedDirectionalCleave |= boss.ObservedDirectionalCleave;
                        observedCenterRupture |= boss.ObservedCenterRupture;
                        observedConvergence |= boss.ObservedConvergence;
                    }
                    if ((exerciseBoss || exerciseRelic || exerciseBossMechanics && observedDirectionalCleave) && boss != null && boss.Phase == 1 && !issuedPhaseOneDamage)
                    {
                        boss.ReceiveHit(720f, player.transform.position, true);
                        issuedPhaseOneDamage = true;
                    }
                    if ((exerciseBoss || exerciseBossMechanics || exerciseRelic) && boss != null && boss.Phase == 2)
                    {
                        observedBossPhase2 = true;
                        if (!issuedPhaseTwoDamage && (!exerciseBossMechanics || observedCenterRupture))
                        {
                            boss.ReceiveHit(680f, player.transform.position, true);
                            issuedPhaseTwoDamage = true;
                        }
                    }
                    if ((exerciseBoss || exerciseBossMechanics || exerciseRelic) && boss != null && boss.Phase == 3)
                    {
                        observedBossPhase3 = true;
                        if (!issuedKillingDamage && (!exerciseBossMechanics || observedConvergence))
                        {
                            boss.ReceiveHit(99999f, player.transform.position, true);
                            issuedKillingDamage = true;
                        }
                    }
                    if (flow.PhaseId == "RelicChoice")
                    {
                        observedRelicChoice = true;
                        if (exerciseRelic)
                        {
                            if (++relicCaptureFrames >= 190) frame = frameBudget;
                        }
                        else if (exerciseBoss || exerciseBossMechanics)
                        {
                            player.transform.position = flow.InteractionTargetPosition;
                            flow.Interact();
                        }
                    }
                    if ((exerciseBoss || exerciseBossMechanics) && flow.PhaseId == "ReturnPortal")
                    {
                        observedReturnPortal = true;
                        player.transform.position = flow.InteractionTargetPosition;
                        flow.Interact();
                    }
                }
                yield return new WaitForEndOfFrame();
            }
            var combatSucceeded = true;
            if (exerciseCombat)
            {
                var enemies = FindObjectsByType<EnemyController>(FindObjectsSortMode.None);
                var totalHealth = enemies.Sum(enemy => enemy.GetComponent<Health>().Current);
                Debug.Log($"QA combat exercised: enemies {initialEnemies}->{enemies.Length}, remaining health {totalHealth:0.0}");
                combatSucceeded = player != null && initialEnemies == 4 && totalHealth < initialHealth;
                if (!combatSucceeded) Debug.LogError("QA combat failed to damage the expected encounter");
            }
            if (exerciseRespawn)
            {
                var looseLoot = FindObjectsByType<LootPickup>(FindObjectsSortMode.None).Length;
                var growthRolledBack = player != null && Mathf.Approximately(player.SpellPower, initialPower) && player.Experience == initialExperience;
                var respawnSucceeded = player != null && observedRespawn && !player.Health.IsDead && Vector3.Distance(player.transform.position, player.RespawnPoint) < 0.25f && flow != null && flow.PhaseId == "GateFight" && growthRolledBack && looseLoot == 0;
                var health = player != null ? player.Health.Current : 0f;
                Debug.Log($"QA respawn exercised: observed={observedRespawn}, health={health:0.0}, phase={flow?.PhaseId ?? "missing"}, growthRollback={growthRolledBack}, looseLoot={looseLoot}, success={respawnSucceeded}");
                combatSucceeded &= respawnSucceeded;
                if (!respawnSucceeded) Debug.LogError("QA respawn failed to restore the checkpoint encounter");
            }
            if (exerciseAnimation)
            {
                var animator = FindFirstObjectByType<ActorSpriteAnimator>();
                var animationSucceeded = animator != null && animator.ObservedIdle && animator.ObservedRun && animator.ObservedAttack && animator.ObservedHit && animator.ObservedDefeated;
                Debug.Log($"QA animation exercised: idle={animator?.ObservedIdle}, run={animator?.ObservedRun}, attack={animator?.ObservedAttack}, hit={animator?.ObservedHit}, defeated={animator?.ObservedDefeated}, success={animationSucceeded}");
                combatSucceeded &= animationSucceeded;
                if (!animationSucceeded) Debug.LogError("QA animation failed to observe the complete Duskweaver state set");
            }
            if (exerciseCovenant)
            {
                var covenantSucceeded = flow != null && flow.PhaseId == "CovenantChoice" && flow.CovenantName == "UNBOUND";
                Debug.Log($"QA covenant choice exercised: phase={flow?.PhaseId ?? "missing"}, covenant={flow?.CovenantName ?? "missing"}, success={covenantSucceeded}");
                combatSucceeded &= covenantSucceeded;
                if (!covenantSucceeded) Debug.LogError("QA covenant choice failed to reach the uncommitted exploration branch");
            }
            if (exerciseEnemyAnimation)
            {
                var animationSucceeded = animatedEnemies.Length > 0;
                var summaries = new string[animatedEnemies.Length];
                for (var i = 0; i < animatedEnemies.Length; i++)
                {
                    var stateSucceeded = observedEnemyStates[i, 0] && observedEnemyStates[i, 1] && observedEnemyStates[i, 2] && observedEnemyStates[i, 3] && observedEnemyStates[i, 4];
                    animationSucceeded &= stateSucceeded;
                    summaries[i] = $"{animatedEnemyNames[i]}[idle={observedEnemyStates[i, 0]}, move={observedEnemyStates[i, 1]}, attack={observedEnemyStates[i, 2]}, hit={observedEnemyStates[i, 3]}, death={observedEnemyStates[i, 4]}]";
                }
                Debug.Log($"QA enemy animation exercised: {string.Join(", ", summaries)}, success={animationSucceeded}");
                combatSucceeded &= animationSucceeded;
                if (!animationSucceeded) Debug.LogError("QA enemy animation failed to observe every configured enemy state set");
            }
            if (exerciseMastery)
            {
                var masterySucceeded = flow != null && observedMasteryChoice && flow.CanChooseMastery && player != null && player.MasteryName == "UNSHAPED";
                Debug.Log($"QA mastery choice exercised: phase={flow?.PhaseId ?? "missing"}, visible={flow?.CanChooseMastery}, success={masterySucceeded}");
                combatSucceeded &= masterySucceeded;
                if (!masterySucceeded) Debug.LogError("QA mastery choice failed to present the uncommitted mastery screen");
            }
            if (exerciseRune)
            {
                var runeSucceeded = flow != null && observedRunePuzzle && flow.PhaseId == "RunePuzzle" && flow.RuneProgress == 0;
                Debug.Log($"QA rune puzzle exercised: phase={flow?.PhaseId ?? "missing"}, progress={flow?.RuneProgress ?? -1}, success={runeSucceeded}");
                combatSucceeded &= runeSucceeded;
                if (!runeSucceeded) Debug.LogError("QA rune puzzle failed to present the playable constellation state");
            }
            if (exerciseAshfall)
            {
                var ashfallSucceeded = flow != null && observedAshfall && flow.PhaseId == "AshfallGauntlet" && FindFirstObjectByType<AshfallHazard>() != null;
                Debug.Log($"QA ashfall exercised: phase={flow?.PhaseId ?? "missing"}, hazard={observedAshfall}, success={ashfallSucceeded}");
                combatSucceeded &= ashfallSucceeded;
                if (!ashfallSucceeded) Debug.LogError("QA ashfall failed to present an active telegraphed hazard");
            }
            if (exerciseWitness)
            {
                var witnessSucceeded = flow != null && observedWitnessDialogue && flow.HasDialogue && player != null && player.WitnessChoice == "UNCHOSEN";
                Debug.Log($"QA witness dialogue exercised: phase={flow?.PhaseId ?? "missing"}, visible={flow?.HasDialogue}, success={witnessSucceeded}");
                combatSucceeded &= witnessSucceeded;
                if (!witnessSucceeded) Debug.LogError("QA witness dialogue failed to present the unresolved choice state");
            }
            if (exerciseElite)
            {
                var eliteSucceeded = flow != null && flow.PhaseId == "EliteFight" && observedEliteShield && FindObjectsByType<EnemyController>(FindObjectsSortMode.None).Any(enemy => enemy.WardShielded);
                Debug.Log($"QA elite shield exercised: phase={flow?.PhaseId ?? "missing"}, shield={observedEliteShield}, success={eliteSucceeded}");
                combatSucceeded &= eliteSucceeded;
                if (!eliteSucceeded) Debug.LogError("QA elite shield failed to present the chained elite state");
            }
            if (exerciseEscort)
            {
                var escortSucceeded = flow != null && flow.PhaseId == "WardflameEscort" && observedEscortStage == 1 && flow.RemainingEnemies > 0;
                Debug.Log($"QA ward-flame escort exercised: phase={flow?.PhaseId ?? "missing"}, stage={observedEscortStage}, enemies={flow?.RemainingEnemies ?? -1}, success={escortSucceeded}");
                combatSucceeded &= escortSucceeded;
                if (!escortSucceeded) Debug.LogError("QA ward-flame escort failed to present the first ambush state");
            }
            if (exerciseRelic)
            {
                var relicSucceeded = flow != null && flow.PhaseId == "RelicChoice" && observedRelicChoice && player != null && player.FinalRelicName == "UNCLAIMED";
                Debug.Log($"QA relic choice exercised: phase={flow?.PhaseId ?? "missing"}, unresolved={player?.FinalRelicName == "UNCLAIMED"}, success={relicSucceeded}");
                combatSucceeded &= relicSucceeded;
                if (!relicSucceeded) Debug.LogError("QA relic choice failed to present the three unresolved legendary altars");
            }
            if (exerciseArchive)
            {
                var archiveSucceeded = flow != null && flow.PhaseId == "ArchiveCurator" && observedArchiveCipher && observedArchiveReset && observedArchivePurge && observedArchiveCurator && observedArchiveSecondJudgment;
                Debug.Log($"QA Black Archive exercised: phase={flow?.PhaseId ?? "missing"}, cipher={observedArchiveCipher}, reset={observedArchiveReset}, purge={observedArchivePurge}, curator={observedArchiveCurator}, secondJudgment={observedArchiveSecondJudgment}, success={archiveSucceeded}");
                combatSucceeded &= archiveSucceeded;
                if (!archiveSucceeded) Debug.LogError("QA Black Archive failed to present the Curator's second judgment");
            }
            if (exerciseFullFlow || exerciseBoss || exerciseBossMechanics)
            {
                var completingBoss = exerciseBoss || exerciseBossMechanics;
                var rewardApplied = !completingBoss || player != null && player.SpellPower > initialPower && player.FinalRelicName != "UNCLAIMED";
                var mechanicsObserved = !exerciseBossMechanics || observedDirectionalCleave && observedCenterRupture && observedConvergence;
                var masteryApplied = player != null && player.MasteryName != "UNSHAPED";
                var witnessChoiceApplied = player != null && player.WitnessChoice != "UNCHOSEN";
                var flowSucceeded = flow != null && observedCovenantChoice && observedEchoHunt && observedMasteryChoice && masteryApplied && observedRunePuzzle && observedRuneReset && observedWardRitual && observedSanctumDefense && observedAshfall && observedWitnessDialogue && witnessChoiceApplied && observedEliteShield && observedEliteShieldBreak && observedEscort && observedEscortStage >= 3 && observedArchiveCipher && observedArchiveReset && observedArchivePurge && observedArchiveCurator && observedArchiveSecondJudgment && (completingBoss ? flow.IsComplete && observedBossPhase2 && observedBossPhase3 && observedRelicChoice && observedReturnPortal && rewardApplied && mechanicsObserved : flow.ReachedBossApproach);
                Debug.Log($"QA flow exercised: phase={flow?.PhaseId ?? "missing"}, covenant={observedCovenantChoice}, echoes={observedEchoHunt}, mastery={observedMasteryChoice}/{masteryApplied}, runes={observedRunePuzzle}, runeReset={observedRuneReset}, ward={observedWardRitual}, defense={observedSanctumDefense}, ashfall={observedAshfall}, witness={observedWitnessDialogue}/{witnessChoiceApplied}, eliteShield={observedEliteShield}/{observedEliteShieldBreak}, escort={observedEscort}/{observedEscortStage}, archive={observedArchiveCipher}/{observedArchiveReset}/{observedArchivePurge}/{observedArchiveSecondJudgment}, bossII={observedBossPhase2}, bossIII={observedBossPhase3}, cleave={observedDirectionalCleave}, rupture={observedCenterRupture}, convergence={observedConvergence}, relic={observedRelicChoice}/{rewardApplied}, portal={observedReturnPortal}, success={flowSucceeded}");
                combatSucceeded &= flowSucceeded;
                if (!flowSucceeded) Debug.LogError(exerciseBoss ? "QA Boss failed to complete all three phases" : "QA flow failed to reach the Boss approach");
            }
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            ScreenCapture.CaptureScreenshot(path);
            var deadline = Time.realtimeSinceStartup + 8f;
            while (!File.Exists(path) && Time.realtimeSinceStartup < deadline) yield return null;
            Debug.Log(File.Exists(path) ? $"QA screenshot saved: {path}" : $"QA screenshot timed out: {path}");
            Application.Quit(File.Exists(path) && combatSucceeded ? 0 : 2);
        }

        private static void KillAllTargets(Vector3 origin)
        {
            foreach (var target in FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None).OfType<ICombatTarget>())
                target.ReceiveHit(99999f, origin, true);
        }
    }
}
