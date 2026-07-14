using UnityEngine;

namespace Nightfall3.Presentation
{
    public sealed class CameraRig : MonoBehaviour
    {
        private static readonly Vector3 FollowOffset = new(0f, 9.4f, -8.2f);
        private static readonly Vector3 LookAhead = new(0f, 0.8f, 3.2f);

        public Transform Target { get; set; }

        private Vector3 velocity;
        private float trauma;

        public void AddTrauma(float amount)
        {
            trauma = Mathf.Clamp01(trauma + amount);
        }

        private void LateUpdate()
        {
            if (Target == null) return;
            var desired = Target.position + FollowOffset;
            transform.position = Vector3.SmoothDamp(transform.position, desired, ref velocity, 0.16f);
            transform.rotation = Quaternion.LookRotation(Target.position + LookAhead - transform.position, Vector3.up);

            if (trauma <= 0f) return;
            var magnitude = trauma * trauma * 0.22f;
            transform.position += new Vector3(Random.Range(-magnitude, magnitude), Random.Range(-magnitude, magnitude), 0f);
            trauma = Mathf.Max(0f, trauma - Time.unscaledDeltaTime * 2.8f);
        }
    }
}
