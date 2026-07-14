using Nightfall3.Actors;
using UnityEngine;

namespace Nightfall3.Combat
{
    public sealed class ArcProjectile : MonoBehaviour
    {
        private float damage;
        private bool critical;
        private Vector3 origin;
        private EnemyController target;

        public void Configure(EnemyController victim, Vector3 source, float damageValue, bool isCritical)
        {
            target = victim;
            origin = source;
            damage = damageValue;
            critical = isCritical;
        }

        private void Update()
        {
            if (target == null)
            {
                Destroy(gameObject);
                return;
            }
            var destination = target.transform.position + Vector3.up * 0.72f;
            transform.position = Vector3.MoveTowards(transform.position, destination, 18f * Time.deltaTime);
            transform.localScale = Vector3.one * (0.16f + Mathf.Sin(Time.time * 42f) * 0.035f);
            if (Vector3.Distance(transform.position, destination) > 0.2f) return;
            target.ReceiveHit(damage, origin, critical);
            Destroy(gameObject);
        }
    }
}
