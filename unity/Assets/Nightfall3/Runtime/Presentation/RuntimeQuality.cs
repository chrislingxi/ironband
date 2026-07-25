using UnityEngine;

namespace Nightfall3.Presentation
{
    public static class RuntimeQuality
    {
        public static void Apply()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            Application.targetFrameRate = 45;
            QualitySettings.vSyncCount = 0;
            QualitySettings.antiAliasing = 0;
            QualitySettings.shadowDistance = 24f;
            QualitySettings.lodBias = 0.72f;
            QualitySettings.pixelLightCount = 3;
#else
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            QualitySettings.antiAliasing = 2;
            QualitySettings.shadowDistance = 42f;
            QualitySettings.lodBias = 1.25f;
            QualitySettings.pixelLightCount = 8;
#endif
        }
    }
}
