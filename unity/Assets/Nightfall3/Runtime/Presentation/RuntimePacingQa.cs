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
    public sealed class RuntimePacingQa : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Install()
        {
            if (Array.IndexOf(Environment.GetCommandLineArgs(), "-qaPacing") < 0) return;
            Application.runInBackground = true;
            Application.targetFrameRate = 60;
            new GameObject("Runtime Pacing QA", typeof(RuntimePacingQa));
        }

        private IEnumerator Start()
        {
            yield return null;
            var player = FindFirstObjectByType<PlayerController>();
            var flow = FindFirstObjectByType<DemoFlowController>();
            if (player == null || flow == null)
            {
                Debug.LogError("QA pacing failed to find the player or flow controller");
                Application.Quit(2);
                yield break;
            }

            flow.Interact();
            var startedAt = Time.realtimeSinceStartup;
            var nextDecision = startedAt + 1.2f;
            var skillCursor = 0;
            var lastPhase = flow.PhaseId;
            var nextStatus = startedAt + 15f;
            var deaths = 0;
            player.Respawned += () =>
            {
                deaths++;
                Debug.Log($"QA pacing respawn: deaths={deaths} at {Time.realtimeSinceStartup - startedAt:0.0}s");
            };
            Debug.Log("QA pacing started with normal movement, attacks, cooldowns and respawn rules");

            while (!flow.IsComplete && Time.realtimeSinceStartup - startedAt < 1500f)
            {
                if (flow.PhaseId != lastPhase)
                {
                    lastPhase = flow.PhaseId;
                    Debug.Log($"QA pacing phase: {lastPhase} at {Time.realtimeSinceStartup - startedAt:0.0}s");
                }

                if (!CinematicDirector.CombatSuppressed)
                {
                    GuideMovement(player, flow);
                    if (Time.realtimeSinceStartup >= nextDecision)
                    {
                        CastNextUsefulSkill(player, ref skillCursor);
                        nextDecision = Time.realtimeSinceStartup + 1.2f;
                    }
                }
                if (Time.realtimeSinceStartup >= nextStatus)
                {
                    var boss = FindFirstObjectByType<BossController>();
                    Debug.Log($"QA pacing status: phase={flow.PhaseId}, playerHP={player.Health.Current:0}/{player.Health.Maximum:0}, bossPhase={boss?.Phase ?? 0}, bossHP={boss?.HealthNormalized ?? 0f:0.00}, elapsed={Time.realtimeSinceStartup - startedAt:0.0}s");
                    nextStatus = Time.realtimeSinceStartup + 15f;
                }
                yield return null;
            }

            yield return new WaitForSecondsRealtime(0.75f);
            var completed = flow.IsComplete;
            var elapsed = Time.realtimeSinceStartup - startedAt;
            var reportExists = File.Exists(DemoRunTelemetry.ReportPath);
            var targetPassed = reportExists && File.ReadAllText(DemoRunTelemetry.ReportPath).Contains("\"targetDurationPassed\": true");
            Debug.Log($"QA pacing complete: completed={completed}, elapsed={elapsed:0.0}s, target15to20={targetPassed}, report={DemoRunTelemetry.ReportPath}");
            if (!completed) Debug.LogError("QA pacing timed out before completing the demo");
            else if (!targetPassed) Debug.LogError("QA pacing completed outside the 15-20 minute target");
            Application.Quit(completed && targetPassed ? 0 : 3);
        }

        private static void GuideMovement(PlayerController player, DemoFlowController flow)
        {
            Vector3 destination;
            switch (flow.PhaseId)
            {
                case "MasteryChoice":
                    flow.SelectMastery(0);
                    return;
                case "RunePattern":
                    return;
                case "RunePuzzle":
                    var runes = new[]
                    {
                        new Vector3(0f, 0.05f, 46.2f),
                        new Vector3(-4.25f, 0.05f, 45f),
                        new Vector3(4.25f, 0.05f, 45f)
                    };
                    var runeTarget = runes[Mathf.Clamp(flow.RuneProgress, 0, 2)];
                    if (Vector3.Distance(player.transform.position, runeTarget) <= 1.15f) flow.Interact();
                    MoveToward(player, runeTarget);
                    return;
                case "CovenantChoice":
                    destination = flow.InteractionTargetPosition;
                    if (Vector3.Distance(player.transform.position, destination) <= 2.5f) flow.Interact();
                    MoveToward(player, destination);
                    return;
                case "AdvanceCauseway": destination = new Vector3(0f, 0.05f, 18f); break;
                case "AdvanceEchoHunt": destination = new Vector3(0f, 0.05f, 27.5f); break;
                case "EchoHunt" when flow.RemainingEnemies == 0:
                    destination = flow.InteractionTargetPosition;
                    if (Vector3.Distance(player.transform.position, destination) <= 2.5f) flow.Interact();
                    MoveToward(player, destination);
                    return;
                case "AdvanceWard": destination = new Vector3(0f, 0.05f, 45.5f); break;
                case "AdvanceDefense": destination = new Vector3(0f, 0.05f, 55.5f); break;
                case "AdvanceGauntlet": destination = new Vector3(0f, 0.05f, 62.5f); break;
                case "AshfallGauntlet": destination = flow.GauntletSafePosition; break;
                case "WitnessApproach":
                    destination = flow.InteractionTargetPosition;
                    if (Vector3.Distance(player.transform.position, destination) <= 2.5f) flow.Interact();
                    MoveToward(player, destination);
                    return;
                case "WitnessDialogue":
                    flow.ChooseDialogue(1);
                    return;
                case "AdvanceElite": destination = new Vector3(0f, 0.05f, 78.5f); break;
                case "WardflameEscort" when flow.RemainingEnemies == 0: destination = flow.EscortTargetPosition; break;
                case "BossApproach": destination = new Vector3(0f, 0.05f, 109.5f); break;
                case "RelicChoice":
                case "ReturnPortal":
                    destination = flow.InteractionTargetPosition;
                    if (Vector3.Distance(player.transform.position, destination) <= 2.2f) flow.Interact();
                    MoveToward(player, destination);
                    return;
                default:
                    var target = FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None)
                        .OfType<ICombatTarget>()
                        .Where(candidate => !candidate.IsDead)
                        .OrderBy(candidate => (candidate.TargetTransform.position - player.transform.position).sqrMagnitude)
                        .FirstOrDefault();
                    if (target == null) return;
                    var delta = target.TargetTransform.position - player.transform.position;
                    delta.y = 0f;
                    player.SetGuidedFacing(delta);
                    var boss = target as BossController;
                    var desiredRange = boss == null ? 3.45f : boss.Phase == 1 ? 4.25f : boss.Phase == 2 ? 4.1f : 3.45f;
                    var radial = delta.normalized * Mathf.Clamp((delta.magnitude - desiredRange) * 1.4f, -1f, 1f);
                    var tangent = Vector3.Cross(Vector3.up, delta.normalized) * (boss != null ? 0.82f : 0.32f);
                    player.ApplyGuidedMovement((radial + tangent).normalized, Time.unscaledDeltaTime);
                    return;
            }
            MoveToward(player, destination);
        }

        private static void MoveToward(PlayerController player, Vector3 destination)
        {
            var delta = destination - player.transform.position;
            delta.y = 0f;
            if (delta.sqrMagnitude > 0.04f) player.ApplyGuidedMovement(delta.normalized, Time.unscaledDeltaTime);
        }

        private static void CastNextUsefulSkill(PlayerController player, ref int cursor)
        {
            for (var attempt = 0; attempt < 3; attempt++)
            {
                var skill = cursor % 3;
                cursor++;
                if (player.GetCooldownNormalized(skill == 2 ? 3 : skill) > 0f) continue;
                switch (skill)
                {
                    case 0: player.CastArcBurst(); return;
                    case 1: player.CastStaticField(); return;
                    default: player.CastFrozenOrb(); return;
                }
            }
        }
    }
}
