using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Nightfall3.Editor
{
    public static class DemoSceneBuilder
    {
        public const string ScenePath = "Assets/Nightfall3/Scenes/Demo.unity";

        [MenuItem("Nightfall 3/Build Demo Scene")]
        public static void BuildScene()
        {
            EnsureRuntimeMaterial();
            Directory.CreateDirectory(Path.GetDirectoryName(ScenePath)!);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            new GameObject("Nightfall 3 Demo", typeof(DemoDirector));
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log($"Nightfall 3 demo scene generated at {ScenePath}");
        }

        private static void EnsureRuntimeMaterial()
        {
            const string materialPath = "Assets/Resources/Materials/RuntimeBase.mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(materialPath) != null) return;
            Directory.CreateDirectory(Path.GetDirectoryName(materialPath)!);
            var shader = Shader.Find("Standard");
            if (shader == null) throw new InvalidDataException("Unity Standard shader is unavailable");
            AssetDatabase.CreateAsset(new Material(shader), materialPath);
            AssetDatabase.SaveAssets();
        }
    }
}
