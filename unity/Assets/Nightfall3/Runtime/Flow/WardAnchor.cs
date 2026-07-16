using System;
using System.Collections;
using Nightfall3.Audio;
using Nightfall3.Combat;
using Nightfall3.Presentation;
using UnityEngine;

namespace Nightfall3.Flow
{
    [RequireComponent(typeof(Health))]
    public sealed class WardAnchor : MonoBehaviour, ICombatTarget
    {
        private Health health;
        private Action<WardAnchor> destroyed;
        private GameObject wardRing;
        private bool dying;

        public Transform TargetTransform => transform;
        public bool IsDead => health == null || health.IsDead;

        public void Configure(float healthValue, GameObject ring, Action<WardAnchor> onDestroyed)
        {
            health = GetComponent<Health>();
            health.Configure(healthValue);
            health.Died += OnDied;
            wardRing = ring;
            destroyed = onDestroyed;
        }

        private void Update()
        {
            if (dying) return;
            transform.Rotate(0f, 42f * Time.deltaTime, 0f, Space.World);
            var pulse = 1f + Mathf.Sin(Time.time * 3.4f) * 0.035f;
            transform.localScale = Vector3.one * pulse;
        }

        public void ReceiveHit(float damage, Vector3 origin, bool critical)
        {
            if (health == null || !health.TakeDamage(damage)) return;
            HitStopController.Instance?.Pulse(critical ? 0.065f : 0.035f);
            Camera.main?.GetComponent<CameraRig>()?.AddTrauma(critical ? 0.34f : 0.16f);
            DemoDirector.SpawnImpact(transform.position + Vector3.up * 1.05f, critical);
            DemoDirector.SpawnDamageNumber(transform.position + Vector3.up * 0.45f, damage, critical);
            AudioDirector.PlayHit(critical);
        }

        private void OnDied()
        {
            if (dying) return;
            dying = true;
            StartCoroutine(ShatterRoutine());
        }

        private IEnumerator ShatterRoutine()
        {
            DemoDirector.SpawnShockwave(transform.position, new Color(0.2f, 0.78f, 1f));
            DemoDirector.SpawnShockwave(transform.position, new Color(0.62f, 0.24f, 1f));
            AudioDirector.PlayDeath(true);
            var start = transform.localScale;
            for (var t = 0f; t < 1f; t += Time.unscaledDeltaTime * 3.8f)
            {
                transform.localScale = Vector3.Lerp(start, new Vector3(1.45f, 0.05f, 1.45f), t);
                yield return null;
            }
            if (wardRing != null) Destroy(wardRing);
            destroyed?.Invoke(this);
            Destroy(gameObject);
        }
    }
}
