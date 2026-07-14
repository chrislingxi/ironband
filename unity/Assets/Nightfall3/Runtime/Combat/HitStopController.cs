using System.Collections;
using UnityEngine;

namespace Nightfall3.Combat
{
    public sealed class HitStopController : MonoBehaviour
    {
        public static HitStopController Instance { get; private set; }

        private Coroutine active;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        public void Pulse(float duration)
        {
            if (active != null) StopCoroutine(active);
            active = StartCoroutine(PulseRoutine(duration));
        }

        private IEnumerator PulseRoutine(float duration)
        {
            Time.timeScale = 0.06f;
            yield return new WaitForSecondsRealtime(duration);
            Time.timeScale = 1f;
            active = null;
        }

        private void OnDisable()
        {
            if (Instance == this) Instance = null;
            Time.timeScale = 1f;
        }
    }
}
