using UnityEngine;

namespace Nightfall3.Presentation
{
    public sealed class TransientPulse : MonoBehaviour
    {
        private float duration;
        private Vector3 endScale;
        private float elapsed;
        private Vector3 startScale;

        public void Configure(Vector3 targetScale, float lifetime)
        {
            startScale = transform.localScale;
            endScale = targetScale;
            duration = lifetime;
        }

        private void Update()
        {
            elapsed += Time.unscaledDeltaTime;
            var t = Mathf.Clamp01(elapsed / Mathf.Max(0.01f, duration));
            transform.localScale = Vector3.Lerp(startScale, endScale, 1f - Mathf.Pow(1f - t, 3f));
            if (t >= 1f) Destroy(gameObject);
        }
    }
}
