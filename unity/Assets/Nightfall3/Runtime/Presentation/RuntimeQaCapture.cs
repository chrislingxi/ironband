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
                Array.IndexOf(args, "-qaRune") >= 0));
        }

        private IEnumerator Capture(string path, bool exerciseCombat, bool exerciseFullFlow, bool exerciseBoss, bool exerciseRespawn, bool exerciseAnimation, bool exerciseEnemyAnimation, bool exerciseCovenant, bool exerciseBossMechanics, bool exerciseMastery, bool exerciseRune)
        {
            var player = FindFirstObjectByType<PlayerController>();
            var flow = FindFirstObjectByType<DemoFlowController>();
            if (exerciseCombat || exerciseFullFlow || exerciseBoss || exerciseRespawn || exerciseAnimation || exerciseEnemyAnimation || exerciseCovenant || exerciseBossMechanics || exerciseMastery || exerciseRune) flow?.Interact();
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
            var frameBudget = exerciseBossMechanics ? 1600 : exerciseBoss ? 900 : exerciseRune ? 760 : exerciseMastery ? 560 : exerciseCovenant ? 420 : exerciseFullFlow ? 720 : exerciseEnemyAnimation ? 360 : exerciseAnimation ? 240 : 180;
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
                if ((exerciseFullFlow || exerciseBoss || exerciseBossMechanics || exerciseMastery || exerciseRune) && player != null && flow != null)
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
                    if (frame > 16 && frame % 12 == 0 && flow.PhaseId is "GateFight" or "CovenantTrial" or "CausewayFight" or "EchoHunt" or "WardRitual" or "SanctumDefense" or "EliteFight")
                        KillAllTargets(player.transform.position);
                    if (flow.PhaseId == "AdvanceCauseway") player.transform.position = new Vector3(0f, 0.05f, 18f);
                    if (flow.PhaseId == "AdvanceEchoHunt") player.transform.position = new Vector3(0f, 0.05f, 27.5f);
                    if (flow.PhaseId == "AdvanceWard") player.transform.position = new Vector3(0f, 0.05f, 45.5f);
                    if (flow.PhaseId == "AdvanceDefense") player.transform.position = new Vector3(0f, 0.05f, 55.5f);
                    if (flow.PhaseId == "AdvanceElite") player.transform.position = new Vector3(0f, 0.05f, 63.5f);
                    if ((exerciseBoss || exerciseBossMechanics) && flow.PhaseId == "BossApproach") player.transform.position = new Vector3(0f, 0.05f, 68.5f);

                    var boss = FindFirstObjectByType<BossController>();
                    if (exerciseBossMechanics && boss != null)
                    {
                        observedDirectionalCleave |= boss.ObservedDirectionalCleave;
                        observedCenterRupture |= boss.ObservedCenterRupture;
                        observedConvergence |= boss.ObservedConvergence;
                    }
                    if ((exerciseBoss || exerciseBossMechanics && observedDirectionalCleave) && boss != null && boss.Phase == 1 && !issuedPhaseOneDamage)
                    {
                        boss.ReceiveHit(720f, player.transform.position, true);
                        issuedPhaseOneDamage = true;
                    }
                    if ((exerciseBoss || exerciseBossMechanics) && boss != null && boss.Phase == 2)
                    {
                        observedBossPhase2 = true;
                        if (!issuedPhaseTwoDamage && (!exerciseBossMechanics || observedCenterRupture))
                        {
                            boss.ReceiveHit(680f, player.transform.position, true);
                            issuedPhaseTwoDamage = true;
                        }
                    }
                    if ((exerciseBoss || exerciseBossMechanics) && boss != null && boss.Phase == 3)
                    {
                        observedBossPhase3 = true;
                        if (!issuedKillingDamage && (!exerciseBossMechanics || observedConvergence))
                        {
                            boss.ReceiveHit(99999f, player.transform.position, true);
                            issuedKillingDamage = true;
                        }
                    }
                    if ((exerciseBoss || exerciseBossMechanics) && flow.PhaseId == "ClaimReward")
                    {
                        var reward = FindObjectsByType<LootPickup>(FindObjectsSortMode.None).FirstOrDefault(pickup => pickup.IsLegendary);
                        if (reward != null) player.transform.position = reward.transform.position;
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
            if (exerciseFullFlow || exerciseBoss || exerciseBossMechanics)
            {
                var completingBoss = exerciseBoss || exerciseBossMechanics;
                var rewardApplied = !completingBoss || player != null && player.SpellPower > initialPower;
                var mechanicsObserved = !exerciseBossMechanics || observedDirectionalCleave && observedCenterRupture && observedConvergence;
                var masteryApplied = player != null && player.MasteryName != "UNSHAPED";
                var flowSucceeded = flow != null && observedCovenantChoice && observedEchoHunt && observedMasteryChoice && masteryApplied && observedRunePuzzle && observedRuneReset && observedWardRitual && observedSanctumDefense && (completingBoss ? flow.IsComplete && observedBossPhase2 && observedBossPhase3 && rewardApplied && mechanicsObserved : flow.ReachedBossApproach);
                Debug.Log($"QA flow exercised: phase={flow?.PhaseId ?? "missing"}, covenant={observedCovenantChoice}, echoes={observedEchoHunt}, mastery={observedMasteryChoice}/{masteryApplied}, runes={observedRunePuzzle}, runeReset={observedRuneReset}, ward={observedWardRitual}, defense={observedSanctumDefense}, bossII={observedBossPhase2}, bossIII={observedBossPhase3}, cleave={observedDirectionalCleave}, rupture={observedCenterRupture}, convergence={observedConvergence}, reward={rewardApplied}, success={flowSucceeded}");
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
