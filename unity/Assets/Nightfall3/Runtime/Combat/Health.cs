using System;
using UnityEngine;

namespace Nightfall3.Combat
{
    public sealed class Health : MonoBehaviour
    {
        [SerializeField] private float maximum = 100f;

        public float Current { get; private set; }
        public float Maximum => maximum;
        public bool IsDead => Current <= 0f;

        public event Action<float, float> Changed;
        public event Action Died;

        private void Awake()
        {
            Current = maximum;
        }

        public void Configure(float value)
        {
            maximum = Mathf.Max(1f, value);
            Current = maximum;
            Changed?.Invoke(Current, maximum);
        }

        public bool TakeDamage(float amount)
        {
            if (IsDead || amount <= 0f) return false;
            Current = Mathf.Max(0f, Current - amount);
            Changed?.Invoke(Current, maximum);
            if (IsDead) Died?.Invoke();
            return true;
        }

        public void IncreaseMaximum(float amount, bool restoreGain)
        {
            if (amount <= 0f) return;
            maximum += amount;
            if (restoreGain) Current = Mathf.Min(maximum, Current + amount);
            Changed?.Invoke(Current, maximum);
        }
    }
}
