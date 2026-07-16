using System;
using Nightfall3.Actors;
using UnityEngine;

namespace Nightfall3.Flow
{
    public sealed class LootPickup : MonoBehaviour
    {
        private Action collected;
        private float experience;
        private float phase;
        private PlayerController player;
        private float power;
        private Vector3 start;

        public void Configure(PlayerController target, float powerGain, float experienceGain, Action onCollected)
        {
            player = target;
            power = powerGain;
            experience = experienceGain;
            collected = onCollected;
            start = transform.position;
            phase = UnityEngine.Random.value * Mathf.PI * 2f;
        }

        private void Update()
        {
            transform.Rotate(0f, 105f * Time.deltaTime, 35f * Time.deltaTime, Space.World);
            transform.position = start + Vector3.up * (Mathf.Sin(Time.time * 3.2f + phase) * 0.12f);
            if (player == null || Vector3.Distance(transform.position, player.transform.position) > 1.35f) return;
            player.GrantRelic(power, Mathf.RoundToInt(experience));
            DemoDirector.SpawnShockwave(transform.position, new Color(0.26f, 0.82f, 1f));
            collected?.Invoke();
            Destroy(gameObject);
        }
    }
}
