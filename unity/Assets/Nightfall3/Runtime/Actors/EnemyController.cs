using System.Collections;
using Nightfall3.Combat;
using Nightfall3.Presentation;
using UnityEngine;

namespace Nightfall3.Actors
{
    [RequireComponent(typeof(Health))]
    public sealed class EnemyController : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 2.1f;
        [SerializeField] private float attackInterval = 1.25f;

        private Transform player;
        private Health playerHealth;
        private Health health;
        private float nextAttack;
        private bool telegraphing;

        public void Configure(Transform target, float healthValue, float speed)
        {
            player = target;
            moveSpeed = speed;
            health = GetComponent<Health>();
            health.Configure(healthValue);
            health.Died += Die;
        }

        private void Update()
        {
            if (health == null || health.IsDead || player == null) return;
            var delta = player.position - transform.position;
            delta.y = 0f;
            var distance = delta.magnitude;

            if (distance > CombatTuning.EnemyAttackRange)
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
            var warning = DemoDirector.CreateGroundRing(transform.position, 1.15f, new Color(0.9f, 0.18f, 0.08f, 0.52f));
            yield return new WaitForSeconds(CombatTuning.EnemyTelegraphSeconds);
            Destroy(warning);

            if (player != null && Vector3.Distance(transform.position, player.position) <= CombatTuning.EnemyAttackRange + 0.3f)
            {
                if (playerHealth == null) playerHealth = player.GetComponent<Health>();
                playerHealth?.TakeDamage(CombatTuning.EnemyAttackDamage);
                var rig = Camera.main != null ? Camera.main.GetComponent<CameraRig>() : null;
                rig?.AddTrauma(0.18f);
            }

            nextAttack = Time.time + attackInterval;
            telegraphing = false;
        }

        public void ReceiveHit(float damage, Vector3 origin, bool critical)
        {
            if (!health.TakeDamage(damage)) return;
            var away = (transform.position - origin).normalized;
            transform.position += away * (critical ? 0.55f : 0.24f);
            HitStopController.Instance?.Pulse(critical ? CombatTuning.CriticalHitStopSeconds : CombatTuning.HitStopSeconds);
            var rig = Camera.main != null ? Camera.main.GetComponent<CameraRig>() : null;
            rig?.AddTrauma(critical ? 0.48f : 0.24f);
            DemoDirector.SpawnImpact(transform.position + Vector3.up * 0.65f, critical);
        }

        private void Die()
        {
            StopAllCoroutines();
            StartCoroutine(DeathRoutine());
        }

        private IEnumerator DeathRoutine()
        {
            var start = transform.localScale;
            for (var t = 0f; t < 1f; t += Time.deltaTime * 4f)
            {
                transform.localScale = Vector3.Lerp(start, new Vector3(start.x * 1.25f, start.y * 0.18f, start.z), t);
                yield return null;
            }
            DemoDirector.SpawnLootBeam(transform.position);
            Destroy(gameObject);
        }
    }
}
