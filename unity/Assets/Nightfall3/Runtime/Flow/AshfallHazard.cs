using System.Collections;
using Nightfall3.Actors;
using UnityEngine;

namespace Nightfall3.Flow
{
    public sealed class AshfallHazard : MonoBehaviour
    {
        private GameObject ring;
        private GameObject shard;
        private PlayerController player;
        private Vector3 impactPosition;

        public void Configure(Vector3 position, PlayerController target)
        {
            impactPosition = position;
            player = target;
            transform.position = position;
            ring = DemoDirector.CreateGroundRing(position, 2.05f, new Color(1f, 0.14f, 0.04f, 0.94f));
            shard = GameObject.CreatePrimitive(PrimitiveType.Cube);
            shard.name = "Falling Ash Shard";
            shard.transform.position = position + Vector3.up * 8f;
            shard.transform.localScale = new Vector3(0.55f, 1.3f, 0.55f);
            shard.transform.rotation = Quaternion.Euler(22f, 35f, 18f);
            var material = Resources.Load<Material>("Materials/RuntimeUnlit");
            if (material != null) shard.GetComponent<Renderer>().material = new Material(material) { color = new Color(1f, 0.18f, 0.04f) };
            Destroy(shard.GetComponent<Collider>());
            StartCoroutine(ImpactRoutine());
        }

        private IEnumerator ImpactRoutine()
        {
            var start = shard.transform.position;
            for (var elapsed = 0f; elapsed < 1.15f; elapsed += Time.unscaledDeltaTime)
            {
                if (shard != null) shard.transform.position = Vector3.Lerp(start, impactPosition + Vector3.up * 0.25f, Mathf.Pow(elapsed / 1.15f, 3f));
                yield return null;
            }
            DemoDirector.SpawnShockwave(impactPosition, new Color(1f, 0.18f, 0.04f));
            DemoDirector.SpawnImpact(impactPosition, true);
            if (player != null && Vector3.Distance(player.transform.position, impactPosition) <= 2.05f)
                player.Health.TakeDamage(24f);
            if (ring != null) Destroy(ring);
            if (shard != null) Destroy(shard);
            Destroy(gameObject, 0.1f);
        }
    }
}
