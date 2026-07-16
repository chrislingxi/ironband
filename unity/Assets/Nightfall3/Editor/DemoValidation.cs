using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Nightfall3.Editor
{
    public static class DemoValidation
    {
        private static readonly string[] RequiredTextures =
        {
            "Assets/Resources/Art/Characters/Sorceress.png",
            "Assets/Resources/Art/Monsters/Fallen.png",
            "Assets/Resources/Art/Monsters/Skeleton.png",
            "Assets/Resources/Art/UI/hp_orb.png",
            "Assets/Resources/Art/UI/mana_orb.png",
            "Assets/Resources/Art/UI/item_slot.png",
            "Assets/Resources/Art/Icons/skill-chain-lightning.png",
            "Assets/Resources/Art/Props/ritual_altar.png",
            "Assets/Resources/Art/Environment/ashen-courtyard-albedo-v1.png",
            "Assets/Resources/Art/Environment/ashen-gate-facade-v1.png"
        };

        [MenuItem("Nightfall 3/Validate Foundation")]
        public static void ValidateFoundation()
        {
            var failures = new List<string>();
            if (!File.Exists(DemoSceneBuilder.ScenePath)) failures.Add($"Missing scene: {DemoSceneBuilder.ScenePath}");
            foreach (var path in RequiredTextures)
            {
                if (AssetDatabase.LoadAssetAtPath<Texture2D>(path) == null) failures.Add($"Missing texture: {path}");
            }
            if (AssetDatabase.LoadAssetAtPath<Material>("Assets/Resources/Materials/RuntimeUnlit.mat") == null)
                failures.Add("Missing unlit telegraph material");

            var sceneEnabled = false;
            foreach (var scene in EditorBuildSettings.scenes)
            {
                if (scene.path == DemoSceneBuilder.ScenePath && scene.enabled) sceneEnabled = true;
            }
            if (!sceneEnabled) failures.Add("Demo scene is not enabled in build settings");
            if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Standalone, BuildTarget.StandaloneOSX))
                failures.Add("macOS build support is unavailable");
            if (PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.iOS) != "com.nightfallforge.nightfall3.demo")
                failures.Add("iOS bundle identifier is not configured");

            if (failures.Count > 0) throw new InvalidOperationException(string.Join(Environment.NewLine, failures));
            Debug.Log($"NIGHTFALL FOUNDATION VALID: {RequiredTextures.Length} required textures, scene enabled, macOS target available");
        }
    }
}
