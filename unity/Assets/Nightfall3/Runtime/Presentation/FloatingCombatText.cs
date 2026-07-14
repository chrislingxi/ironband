using UnityEngine;

namespace Nightfall3.Presentation
{
    public sealed class FloatingCombatText : MonoBehaviour
    {
        private Color color;
        private TextMesh label;
        private float life;

        public void Configure(float damage, bool critical)
        {
            label = gameObject.AddComponent<TextMesh>();
            label.text = Mathf.RoundToInt(damage).ToString();
            label.anchor = TextAnchor.MiddleCenter;
            label.alignment = TextAlignment.Center;
            label.fontSize = critical ? 68 : 48;
            label.characterSize = critical ? 0.034f : 0.029f;
            label.fontStyle = critical ? FontStyle.Bold : FontStyle.Normal;
            color = critical ? new Color(1f, 0.72f, 0.18f) : new Color(0.68f, 0.9f, 1f);
            label.color = color;
        }

        private void LateUpdate()
        {
            life += Time.unscaledDeltaTime;
            transform.position += Vector3.up * (Time.unscaledDeltaTime * (0.9f + life));
            var camera = Camera.main;
            if (camera != null) transform.rotation = camera.transform.rotation;
            if (label != null) label.color = new Color(color.r, color.g, color.b, Mathf.Clamp01(1.15f - life * 1.5f));
            if (life >= 0.8f) Destroy(gameObject);
        }
    }
}
