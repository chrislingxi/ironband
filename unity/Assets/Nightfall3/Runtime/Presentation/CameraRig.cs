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
        private Vector3 focusPoint;
        private float focusUntil;
        private float focusFieldOfView = 32f;
        private Camera attachedCamera;

        private void Awake()
        {
            attachedCamera = GetComponent<Camera>();
        }

        public void AddTrauma(float amount)
        {
            trauma = Mathf.Clamp01(trauma + amount);
        }

        public void Focus(Vector3 worldPoint, float duration, float fieldOfView = 32f)
        {
            focusPoint = worldPoint;
            focusUntil = Time.unscaledTime + Mathf.Max(0.1f, duration);
            focusFieldOfView = Mathf.Clamp(fieldOfView, 28f, 38f);
        }

        private void LateUpdate()
        {
            if (Target == null) return;
            var focused = Time.unscaledTime < focusUntil;
            var subject = focused ? focusPoint : Target.position;
            var offset = focused ? new Vector3(0f, 10.8f, -10.4f) : FollowOffset;
            var desired = subject + offset;
            transform.position = Vector3.SmoothDamp(transform.position, desired, ref velocity, focused ? 0.3f : 0.16f, Mathf.Infinity, Time.unscaledDeltaTime);
            var lookAhead = focused ? new Vector3(0f, 0.9f, 1.35f) : LookAhead;
            var desiredRotation = Quaternion.LookRotation(subject + lookAhead - transform.position, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, desiredRotation, 1f - Mathf.Exp(-8f * Time.unscaledDeltaTime));
            if (attachedCamera != null)
            {
                var targetFieldOfView = focused ? focusFieldOfView : 38f;
                attachedCamera.fieldOfView = Mathf.Lerp(attachedCamera.fieldOfView, targetFieldOfView, 1f - Mathf.Exp(-5.5f * Time.unscaledDeltaTime));
            }

            if (trauma <= 0f) return;
            var magnitude = trauma * trauma * 0.22f;
            transform.position += new Vector3(Random.Range(-magnitude, magnitude), Random.Range(-magnitude, magnitude), 0f);
            trauma = Mathf.Max(0f, trauma - Time.unscaledDeltaTime * 2.8f);
        }
    }
}
