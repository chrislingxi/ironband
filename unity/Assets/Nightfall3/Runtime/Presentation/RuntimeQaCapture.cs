using System;
using System.Collections;
using System.IO;
using System.Linq;
using Nightfall3.Actors;
using Nightfall3.Combat;
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
            runner.StartCoroutine(runner.Capture(args[index + 1], Array.IndexOf(args, "-qaCombat") >= 0));
        }

        private IEnumerator Capture(string path, bool exerciseCombat)
        {
            var player = FindFirstObjectByType<PlayerController>();
            var startingEnemies = FindObjectsByType<EnemyController>(FindObjectsSortMode.None);
            var initialEnemies = startingEnemies.Length;
            var initialHealth = startingEnemies.Sum(enemy => enemy.GetComponent<Health>().Current);
            for (var frame = 0; frame < 180; frame++)
            {
                if (exerciseCombat && player != null)
                {
                    if (frame == 25) player.CastArcBurst();
                    if (frame == 70) player.CastStaticField();
                    if (frame == 112) player.CastTeleport();
                    if (frame == 148) player.CastFrozenOrb();
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
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            ScreenCapture.CaptureScreenshot(path);
            var deadline = Time.realtimeSinceStartup + 8f;
            while (!File.Exists(path) && Time.realtimeSinceStartup < deadline) yield return null;
            Debug.Log(File.Exists(path) ? $"QA screenshot saved: {path}" : $"QA screenshot timed out: {path}");
            Application.Quit(File.Exists(path) && combatSucceeded ? 0 : 2);
        }
    }
}
