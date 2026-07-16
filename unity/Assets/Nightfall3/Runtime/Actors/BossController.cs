using System;
using System.Collections;
using System.Collections.Generic;
using Nightfall3.Combat;
using Nightfall3.Audio;
using Nightfall3.Presentation;
using UnityEngine;

namespace Nightfall3.Actors
{
    [RequireComponent(typeof(Health))]
    public sealed class BossController : MonoBehaviour, ICombatTarget
    {
        private Health health;
        private Transform player;
        private Health playerHealth;
        private bool attacking;
        private bool transitioning;
        private float nextAttack;
        private Coroutine attackRoutine;
        private readonly List<GameObject> activeTelegraphs = new();

        public event Action Defeated;
        public Transform TargetTransform => transform;
        public bool IsDead => health == null || health.IsDead;
        public int Phase { get; private set; } = 1;
        public float HealthNormalized => health == null ? 0f : health.Current / health.Maximum;

        public void Configure(Transform target, float maximumHealth)
        {
            player = target;
            playerHealth = target.GetComponent<Health>();
            health = GetComponent<Health>();
            health.Configure(maximumHealth);
            health.Changed += OnHealthChanged;
            health.Died += OnDied;
        }

        private void Update()
        {
            if (IsDead || player == null || transitioning) return;
            var delta = player.position - transform.position;
            delta.y = 0f;
            var desiredRange = Phase == 1 ? 2.4f : Phase == 2 ? 4.3f : 3.2f;
            if (!attacking && delta.magnitude > desiredRange)
            {
                var speed = Phase == 3 ? 2.8f : 2.05f;
                transform.position += delta.normalized * (speed * Time.deltaTime);
            }
            if (!attacking && Time.time >= nextAttack) attackRoutine = StartCoroutine(AttackRoutine());
        }

        private IEnumerator AttackRoutine()
        {
            attacking = true;
            if (Phase == 1) yield return CleavingJudgment();
            else if (Phase == 2) yield return WardRupture();
            else yield return LastCitadelPulse();
            nextAttack = Time.time + (Phase == 3 ? 0.62f : 0.9f);
            attacking = false;
            attackRoutine = null;
        }

        private IEnumerator CleavingJudgment()
        {
            var warning = Track(DemoDirector.CreateGroundRing(transform.position, 2.8f, new Color(1f, 0.28f, 0.08f, 0.76f)));
            yield return new WaitForSeconds(0.62f);
            if (player != null && Vector3.Distance(transform.position, player.position) <= 3f)
            {
                playerHealth?.TakeDamage(18f);
                DemoDirector.SpawnImpact(player.position + Vector3.up * 0.8f, true);
                Camera.main?.GetComponent<CameraRig>()?.AddTrauma(0.62f);
            }
            DemoDirector.SpawnShockwave(transform.position, new Color(1f, 0.24f, 0.06f));
            Destroy(warning);
            activeTelegraphs.Remove(warning);
            yield return new WaitForSeconds(0.24f);
        }

        private IEnumerator WardRupture()
        {
            var center = player != null ? player.position : transform.position;
            var rings = new GameObject[3];
            for (var i = 0; i < rings.Length; i++)
            {
                var offset = Quaternion.Euler(0f, i * 120f, 0f) * Vector3.forward * 1.65f;
                rings[i] = Track(DemoDirector.CreateGroundRing(center + offset, 1.35f, new Color(0.22f, 0.72f, 1f, 0.8f)));
            }
            yield return new WaitForSeconds(0.72f);
            foreach (var ring in rings)
            {
                if (ring == null) continue;
                if (player != null && Vector3.Distance(ring.transform.position, player.position) <= 1.45f)
                    playerHealth?.TakeDamage(14f);
                DemoDirector.SpawnShockwave(ring.transform.position, new Color(0.18f, 0.66f, 1f));
                Destroy(ring);
                activeTelegraphs.Remove(ring);
            }
            yield return new WaitForSeconds(0.2f);
        }

        private IEnumerator LastCitadelPulse()
        {
            var warning = Track(DemoDirector.CreateGroundRing(transform.position, 4.6f, new Color(0.78f, 0.12f, 0.95f, 0.88f)));
            yield return new WaitForSeconds(0.44f);
            if (player != null && Vector3.Distance(transform.position, player.position) <= 4.8f)
                playerHealth?.TakeDamage(22f);
            for (var i = 0; i < 3; i++)
            {
                DemoDirector.SpawnShockwave(transform.position, new Color(0.72f, 0.12f + i * 0.08f, 1f));
                yield return new WaitForSeconds(0.08f);
            }
            Destroy(warning);
            activeTelegraphs.Remove(warning);
        }

        public void ReceiveHit(float damage, Vector3 origin, bool critical)
        {
            if (!health.TakeDamage(damage)) return;
            var away = (transform.position - origin).normalized;
            transform.position += away * (critical ? 0.12f : 0.04f);
            HitStopController.Instance?.Pulse(critical ? 0.07f : 0.045f);
            Camera.main?.GetComponent<CameraRig>()?.AddTrauma(critical ? 0.36f : 0.18f);
            DemoDirector.SpawnImpact(transform.position + Vector3.up * 1.25f, critical);
            DemoDirector.SpawnDamageNumber(transform.position + Vector3.up * 0.5f, damage, critical);
            AudioDirector.PlayHit(critical);
            StartCoroutine(HitFlash(critical));
        }

        private void OnHealthChanged(float current, float maximum)
        {
            var ratio = current / maximum;
            if (Phase == 1 && ratio <= 0.66f) StartCoroutine(TransitionTo(2));
            else if (Phase == 2 && ratio <= 0.33f) StartCoroutine(TransitionTo(3));
        }

        private IEnumerator TransitionTo(int phase)
        {
            transitioning = true;
            attacking = false;
            if (attackRoutine != null) StopCoroutine(attackRoutine);
            attackRoutine = null;
            ClearTelegraphs();
            Phase = phase;
            AudioDirector.PlaySkill(phase == 2 ? 0.62f : 0.48f);
            var visual = GetComponentInChildren<SpriteRenderer>();
            var targetScale = phase == 2 ? Vector3.one * 1.1f : Vector3.one * 1.22f;
            var color = phase == 2 ? new Color(0.68f, 0.9f, 1f) : new Color(1f, 0.58f, 0.72f);
            for (var i = 0; i < 4; i++)
            {
                DemoDirector.SpawnShockwave(transform.position, color);
                yield return new WaitForSecondsRealtime(0.1f);
            }
            transform.localScale = targetScale;
            if (visual != null) visual.color = color;
            Camera.main?.GetComponent<CameraRig>()?.AddTrauma(0.8f);
            nextAttack = Time.time + 0.35f;
            transitioning = false;
        }

        private IEnumerator HitFlash(bool critical)
        {
            var visual = GetComponentInChildren<SpriteRenderer>();
            if (visual == null) yield break;
            var original = visual.color;
            visual.color = critical ? Color.white : new Color(0.62f, 0.9f, 1f);
            yield return new WaitForSecondsRealtime(critical ? 0.1f : 0.065f);
            if (visual != null) visual.color = original;
        }

        private void OnDied()
        {
            StopAllCoroutines();
            ClearTelegraphs();
            AudioDirector.PlayDeath(true);
            StartCoroutine(DeathRoutine());
        }

        private GameObject Track(GameObject telegraph)
        {
            activeTelegraphs.Add(telegraph);
            return telegraph;
        }

        private void ClearTelegraphs()
        {
            foreach (var telegraph in activeTelegraphs)
            {
                if (telegraph != null) Destroy(telegraph);
            }
            activeTelegraphs.Clear();
        }

        private IEnumerator DeathRoutine()
        {
            DemoDirector.SpawnShockwave(transform.position, new Color(1f, 0.38f, 0.08f));
            DemoDirector.SpawnShockwave(transform.position, new Color(0.24f, 0.76f, 1f));
            Camera.main?.GetComponent<CameraRig>()?.AddTrauma(1f);
            var start = transform.localScale;
            for (var t = 0f; t < 1f; t += Time.unscaledDeltaTime * 1.5f)
            {
                transform.localScale = Vector3.Lerp(start, new Vector3(start.x * 1.4f, 0.08f, start.z * 1.4f), t);
                yield return null;
            }
            DemoDirector.SpawnLootBeam(transform.position + Vector3.left * 0.8f);
            DemoDirector.SpawnLootBeam(transform.position + Vector3.right * 0.8f);
            Defeated?.Invoke();
            Destroy(gameObject);
        }
    }
}
