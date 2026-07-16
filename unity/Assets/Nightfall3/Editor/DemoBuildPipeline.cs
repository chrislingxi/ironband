using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;

namespace Nightfall3.Editor
{
    public static class DemoBuildPipeline
    {
        public static void BuildMac() => Build(BuildTarget.StandaloneOSX, "Builds/macOS/Nightfall3.app");
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Builds/Web");
        public static void BuildIOS() => Build(BuildTarget.iOS, "Builds/iOS");

        private static void Build(BuildTarget target, string location)
        {
            DemoSceneBuilder.BuildScene();
            ConfigurePlayer();
            Directory.CreateDirectory(Path.GetDirectoryName(location) ?? location);
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { DemoSceneBuilder.ScenePath },
                target = target,
                locationPathName = location,
                options = BuildOptions.StrictMode
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException($"{target} build failed: {report.summary.result}");
            Debug.Log($"{target} build succeeded: {report.summary.totalSize} bytes at {location}");
        }

        private static void ConfigurePlayer()
        {
            PlayerSettings.companyName = "Nightfall Forge";
            PlayerSettings.productName = "Nightfall 3 Demo";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.nightfallforge.nightfall3.demo");
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.runInBackground = false;
            PlayerSettings.stripEngineCode = true;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.iOS, new[] { GraphicsDeviceType.Metal });
            PlayerSettings.iOS.targetOSVersionString = "15.0";
            PlayerSettings.iOS.sdkVersion = iOSSdkVersion.DeviceSDK;
            PlayerSettings.iOS.requiresPersistentWiFi = false;
        }
    }
}
