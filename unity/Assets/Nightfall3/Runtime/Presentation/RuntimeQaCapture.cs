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
                Array.IndexOf(args, "-qaRespawn") >= 0));
        }

        private IEnumerator Capture(string path, bool exerciseCombat, bool exerciseFullFlow, bool exerciseBoss, bool exerciseRespawn)
        {
            var player = FindFirstObjectByType<PlayerController>();
            var flow = FindFirstObjectByType<DemoFlowController>();
            if (exerciseCombat || exerciseFullFlow || exerciseBoss || exerciseRespawn) flow?.Interact();
            var startingEnemies = FindObjectsByType<EnemyController>(FindObjectsSortMode.None);
            var initialEnemies = startingEnemies.Length;
            var initialHealth = startingEnemies.Sum(enemy => enemy.GetComponent<Health>().Current);
            var initialPower = player != null ? player.SpellPower : 0f;
            var observedBossPhase2 = false;
            var observedBossPhase3 = false;
            var observedWardRitual = false;
            var observedRespawn = false;
            if (player != null) player.Respawned += () => observedRespawn = true;
            var issuedPhaseOneDamage = false;
            var issuedPhaseTwoDamage = false;
            var issuedKillingDamage = false;
            var frameBudget = exerciseBoss ? 620 : exerciseFullFlow ? 360 : 180;
            for (var frame = 0; frame < frameBudget; frame++)
            {
                if (exerciseRespawn && frame == 24 && player != null) player.Health.TakeDamage(99999f);
                if (exerciseCombat && player != null)
                {
                    if (frame == 25) player.CastArcBurst();
                    if (frame == 70) player.CastStaticField();
                    if (frame == 112) player.CastTeleport();
                    if (frame == 148) player.CastFrozenOrb();
                }
                if ((exerciseFullFlow || exerciseBoss) && player != null && flow != null)
                {
                    if (flow.PhaseId == "WardRitual") observedWardRitual = true;
                    if (frame > 16 && frame % 12 == 0 && flow.PhaseId is "GateFight" or "CausewayFight" or "WardRitual" or "EliteFight")
                        KillAllTargets(player.transform.position);
                    if (flow.PhaseId == "AdvanceCauseway") player.transform.position = new Vector3(0f, 0.05f, 10.5f);
                    if (flow.PhaseId == "AdvanceWard") player.transform.position = new Vector3(0f, 0.05f, 20.5f);
                    if (flow.PhaseId == "AdvanceElite") player.transform.position = new Vector3(0f, 0.05f, 26f);
                    if (exerciseBoss && flow.PhaseId == "BossApproach") player.transform.position = new Vector3(0f, 0.05f, 30.5f);

                    var boss = FindFirstObjectByType<BossController>();
                    if (exerciseBoss && boss != null && boss.Phase == 1 && !issuedPhaseOneDamage)
                    {
                        boss.ReceiveHit(720f, player.transform.position, true);
                        issuedPhaseOneDamage = true;
                    }
                    if (exerciseBoss && boss != null && boss.Phase == 2)
                    {
                        observedBossPhase2 = true;
                        if (!issuedPhaseTwoDamage)
                        {
                            boss.ReceiveHit(680f, player.transform.position, true);
                            issuedPhaseTwoDamage = true;
                        }
                    }
                    if (exerciseBoss && boss != null && boss.Phase == 3)
                    {
                        observedBossPhase3 = true;
                        if (!issuedKillingDamage)
                        {
                            boss.ReceiveHit(99999f, player.transform.position, true);
                            issuedKillingDamage = true;
                        }
                    }
                    if (exerciseBoss && flow.PhaseId == "ClaimReward")
                    {
                        var reward = FindFirstObjectByType<LootPickup>();
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
                var respawnSucceeded = player != null && observedRespawn && !player.Health.IsDead && Vector3.Distance(player.transform.position, player.RespawnPoint) < 0.25f && flow != null && flow.PhaseId == "GateFight";
                var health = player != null ? player.Health.Current : 0f;
                Debug.Log($"QA respawn exercised: observed={observedRespawn}, health={health:0.0}, phase={flow?.PhaseId ?? "missing"}, success={respawnSucceeded}");
                combatSucceeded &= respawnSucceeded;
                if (!respawnSucceeded) Debug.LogError("QA respawn failed to restore the checkpoint encounter");
            }
            if (exerciseFullFlow || exerciseBoss)
            {
                var rewardApplied = !exerciseBoss || player != null && player.SpellPower > initialPower;
                var flowSucceeded = flow != null && observedWardRitual && (exerciseBoss ? flow.IsComplete && observedBossPhase2 && observedBossPhase3 && rewardApplied : flow.ReachedBossApproach);
                Debug.Log($"QA flow exercised: phase={flow?.PhaseId ?? "missing"}, ward={observedWardRitual}, bossII={observedBossPhase2}, bossIII={observedBossPhase3}, reward={rewardApplied}, success={flowSucceeded}");
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
