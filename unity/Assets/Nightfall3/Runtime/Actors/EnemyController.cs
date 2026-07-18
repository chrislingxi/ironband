using System.Collections;
using Nightfall3.Combat;
using Nightfall3.Audio;
using Nightfall3.Presentation;
using UnityEngine;

namespace Nightfall3.Actors
{
    public enum EnemyArchetype
    {
        Raider,
        Shieldguard,
        Hound,
        Brute
    }

    [RequireComponent(typeof(Health))]
    public sealed class EnemyController : MonoBehaviour, ICombatTarget
    {
        [SerializeField] private float moveSpeed = 2.1f;
        [SerializeField] private float attackInterval = 1.25f;

        private Transform player;
        private Health playerHealth;
        private Health health;
        private float nextAttack;
        private bool telegraphing;
        private EnemyArchetype archetype;
        private Vector3 facing = Vector3.back;
        private EnemySpriteAnimator spriteAnimator;

        public Transform TargetTransform => transform;
        public bool IsDead => health == null || health.IsDead;

        public void Configure(Transform target, float healthValue, float speed, EnemyArchetype enemyArchetype)
        {
            player = target;
            moveSpeed = speed;
            archetype = enemyArchetype;
            health = GetComponent<Health>();
            health.Configure(healthValue);
            health.Died += Die;
        }

        private void Update()
        {
            if (health == null || health.IsDead || player == null || CinematicDirector.CombatSuppressed) return;
            var delta = player.position - transform.position;
            delta.y = 0f;
            var distance = delta.magnitude;
            if (delta.sqrMagnitude > 0.01f) facing = delta.normalized;

            if (telegraphing) return;

            if (archetype == EnemyArchetype.Hound && distance is > 2.2f and < 5.4f && Time.time >= nextAttack)
            {
                StartCoroutine(AttackRoutine());
                return;
            }

            var attackRange = archetype == EnemyArchetype.Brute ? 1.75f : CombatTuning.EnemyAttackRange;
            if (distance > attackRange)
            {
                transform.position += delta.normalized * (moveSpeed * Time.deltaTime);
                return;
            }

            if (!telegraphing && Time.time >= nextAttack)
                StartCoroutine(AttackRoutine());
        }

        private IEnumerator AttackRoutine()
        {
            telegraphing = true;
            SpriteAnimator?.PlayAttack(archetype == EnemyArchetype.Brute ? 0.72f : archetype == EnemyArchetype.Hound ? 0.42f : 0.34f);
            switch (archetype)
            {
                case EnemyArchetype.Hound:
                    yield return HoundPounceRoutine();
                    break;
                case EnemyArchetype.Brute:
                    yield return BruteSlamRoutine();
                    break;
                case EnemyArchetype.Shieldguard:
                    yield return MeleeRoutine(1.28f, 0.56f, 10f, 0.2f);
                    break;
                default:
                    yield return MeleeRoutine(1.15f, CombatTuning.EnemyTelegraphSeconds, CombatTuning.EnemyAttackDamage, 0.18f);
                    break;
            }

            nextAttack = Time.time + attackInterval;
            telegraphing = false;
        }

        private IEnumerator MeleeRoutine(float radius, float telegraphSeconds, float damage, float trauma)
        {
            var warning = DemoDirector.CreateGroundRing(transform.position, radius, new Color(0.9f, 0.18f, 0.08f, 0.52f));
            yield return new WaitForSeconds(telegraphSeconds);
            Destroy(warning);
            if (CinematicDirector.CombatSuppressed || player == null || Vector3.Distance(transform.position, player.position) > radius + 0.32f) yield break;
            DamagePlayer(damage, trauma);
        }

        private IEnumerator HoundPounceRoutine()
        {
            if (player == null) yield break;
            var targetPosition = player.position;
            var warning = DemoDirector.CreateGroundRing(targetPosition, 0.92f, new Color(1f, 0.22f, 0.06f, 0.64f));
            yield return new WaitForSeconds(0.48f);
            Destroy(warning);

            var start = transform.position;
            targetPosition.y = start.y;
            for (var t = 0f; t < 1f; t += Time.deltaTime / 0.14f)
            {
                transform.position = Vector3.Lerp(start, targetPosition, Mathf.SmoothStep(0f, 1f, t));
                yield return null;
            }
            transform.position = targetPosition;
            if (!CinematicDirector.CombatSuppressed && player != null && Vector3.Distance(transform.position, player.position) <= 1.45f)
                DamagePlayer(12f, 0.28f);
            yield return new WaitForSeconds(0.58f);
        }

        private IEnumerator BruteSlamRoutine()
        {
            var warning = DemoDirector.CreateGroundRing(transform.position, 1.9f, new Color(1f, 0.34f, 0.05f, 0.68f));
            yield return new WaitForSeconds(0.88f);
            Destroy(warning);
            if (CinematicDirector.CombatSuppressed || player == null || Vector3.Distance(transform.position, player.position) > 2.15f) yield break;
            DamagePlayer(18f, 0.42f);
            var away = player.position - transform.position;
            away.y = 0f;
            player.GetComponent<PlayerController>()?.ApplyKnockback(away.normalized * 1.35f);
            DemoDirector.SpawnShockwave(transform.position, new Color(1f, 0.28f, 0.05f));
        }

        private void DamagePlayer(float damage, float trauma)
        {
            if (playerHealth == null && player != null) playerHealth = player.GetComponent<Health>();
            playerHealth?.TakeDamage(damage);
            var rig = Camera.main != null ? Camera.main.GetComponent<CameraRig>() : null;
            rig?.AddTrauma(trauma);
        }

        public void ReceiveHit(float damage, Vector3 origin, bool critical)
        {
            var incoming = origin - transform.position;
            incoming.y = 0f;
            var blocked = archetype == EnemyArchetype.Shieldguard && incoming.sqrMagnitude > 0.01f && Vector3.Dot(incoming.normalized, facing) > 0.15f;
            var appliedDamage = blocked ? damage * 0.42f : damage;
            if (!health.TakeDamage(appliedDamage)) return;
            SpriteAnimator?.PlayHit();
            var away = (transform.position - origin).normalized;
            var knockback = archetype == EnemyArchetype.Brute ? 0.08f : blocked ? 0.12f : critical ? 0.55f : 0.24f;
            transform.position += away * knockback;
            HitStopController.Instance?.Pulse(critical ? CombatTuning.CriticalHitStopSeconds : CombatTuning.HitStopSeconds);
            var rig = Camera.main != null ? Camera.main.GetComponent<CameraRig>() : null;
            rig?.AddTrauma(critical ? 0.48f : 0.24f);
            DemoDirector.SpawnImpact(transform.position + Vector3.up * 0.65f, critical);
            DemoDirector.SpawnDamageNumber(transform.position, appliedDamage, critical && !blocked);
            AudioDirector.PlayHit(critical);
            StartCoroutine(HitFlashRoutine(critical));
        }

        private IEnumerator HitFlashRoutine(bool critical)
        {
            var visual = GetComponentInChildren<SpriteRenderer>();
            if (visual == null) yield break;
            var original = visual.color;
            visual.color = critical ? new Color(1f, 0.74f, 0.28f) : new Color(0.62f, 0.9f, 1f);
            yield return new WaitForSecondsRealtime(critical ? 0.11f : 0.075f);
            if (visual != null) visual.color = original;
        }

        private void Die()
        {
            StopAllCoroutines();
            SpriteAnimator?.PlayDeath();
            AudioDirector.PlayDeath();
            StartCoroutine(DeathRoutine());
        }

        private IEnumerator DeathRoutine()
        {
            if (SpriteAnimator != null && SpriteAnimator.HasDeathFrame)
            {
                yield return new WaitForSeconds(0.48f);
            }
            else
            {
                var start = transform.localScale;
                for (var t = 0f; t < 1f; t += Time.deltaTime * 4f)
                {
                    transform.localScale = Vector3.Lerp(start, new Vector3(start.x * 1.25f, start.y * 0.18f, start.z), t);
                    yield return null;
                }
            }
            if (player != null && Random.value <= 0.36f)
            {
                DemoDirector.SpawnLootBeam(transform.position);
                DemoDirector.SpawnLootPickup(transform.position, player.GetComponent<PlayerController>(), false);
            }
            Destroy(gameObject);
        }

        private EnemySpriteAnimator SpriteAnimator => spriteAnimator != null ? spriteAnimator : spriteAnimator = GetComponentInChildren<EnemySpriteAnimator>();
    }
}
