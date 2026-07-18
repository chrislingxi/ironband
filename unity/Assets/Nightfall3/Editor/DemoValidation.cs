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
            "Assets/Resources/Art/Characters/duskweaver-v2.png",
            "Assets/Resources/Art/Monsters/bloodbound-fallen-v2.png",
            "Assets/Resources/Art/Monsters/coldbone-shieldguard-v2.png",
            "Assets/Resources/Art/Monsters/blood-ash-hound-v2.png",
            "Assets/Resources/Art/Monsters/blue-ash-juggernaut-v2.png",
            "Assets/Resources/Art/UI/hp_orb.png",
            "Assets/Resources/Art/UI/mana_orb.png",
            "Assets/Resources/Art/UI/panel-v2.png",
            "Assets/Resources/Art/Icons/skill-chain-arc-v2.png",
            "Assets/Resources/Art/Icons/skill-static-dominion-v2.png",
            "Assets/Resources/Art/Icons/skill-phase-step-v2.png",
            "Assets/Resources/Art/Icons/skill-frozen-star-v2.png",
            "Assets/Resources/Art/Props/ritual_altar.png",
            "Assets/Resources/Art/Props/blacksmith_anvil.png",
            "Assets/Resources/Art/NPCs/kashya.png",
            "Assets/Resources/Art/NPCs/charsi.png",
            "Assets/Resources/Art/NPCs/akara.png",
            "Assets/Resources/Art/Bosses/ashen-castellan-v1.png",
            "Assets/Resources/Art/Environment/ashen-courtyard-albedo-v1.png",
            "Assets/Resources/Art/Environment/ashen-gate-facade-v1.png"
        };

        private static readonly string[] RequiredAudio =
        {
            "Assets/Resources/Audio/Music/emberwatch-cathedral.mp3",
            "Assets/Resources/Audio/Music/ashen-approach-atmosphere.mp3",
            "Assets/Resources/Audio/SFX/hit.mp3",
            "Assets/Resources/Audio/SFX/skill.mp3",
            "Assets/Resources/Audio/SFX/pickup.mp3",
            "Assets/Resources/Audio/SFX/death.mp3",
            "Assets/Resources/Audio/SFX/select.mp3"
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
            foreach (var path in RequiredAudio)
            {
                if (AssetDatabase.LoadAssetAtPath<AudioClip>(path) == null) failures.Add($"Missing audio: {path}");
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
            Debug.Log($"NIGHTFALL FOUNDATION VALID: {RequiredTextures.Length} textures, {RequiredAudio.Length} audio clips, scene enabled, macOS target available");
        }
    }
}
