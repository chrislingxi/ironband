using System;
using System.Collections;
using System.IO;
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
            runner.StartCoroutine(runner.Capture(args[index + 1]));
        }

        private IEnumerator Capture(string path)
        {
            for (var frame = 0; frame < 150; frame++) yield return new WaitForEndOfFrame();
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            ScreenCapture.CaptureScreenshot(path);
            var deadline = Time.realtimeSinceStartup + 8f;
            while (!File.Exists(path) && Time.realtimeSinceStartup < deadline) yield return null;
            Debug.Log(File.Exists(path) ? $"QA screenshot saved: {path}" : $"QA screenshot timed out: {path}");
            Application.Quit(File.Exists(path) ? 0 : 2);
        }
    }
}
