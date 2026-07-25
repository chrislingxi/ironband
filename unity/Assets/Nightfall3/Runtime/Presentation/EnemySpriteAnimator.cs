using System.Collections;
using UnityEngine;

namespace Nightfall3.Presentation
{
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class EnemySpriteAnimator : MonoBehaviour
    {
        private Sprite attackFrame;
        private Coroutine action;
        private Sprite deathFrame;
        private bool dead;
        private Sprite hitFrame;
        private Sprite idleFrame;
        private Vector3 lastPosition;
        private Sprite moveFrame;
        private SpriteRenderer spriteRenderer;
        private Transform trackedRoot;

        public bool HasDeathFrame => deathFrame != null;
        public bool ObservedIdle { get; private set; }
        public bool ObservedMove { get; private set; }
        public bool ObservedAttack { get; private set; }
        public bool ObservedHit { get; private set; }
        public bool ObservedDeath { get; private set; }

        public void Configure(Transform root, float worldHeight, string idleResource, string moveResource, string attackResource, string hitResource, string deathResource)
        {
            trackedRoot = root;
            spriteRenderer = GetComponent<SpriteRenderer>();
            idleFrame = LoadFrame(idleResource, worldHeight);
            moveFrame = LoadFrame(moveResource, worldHeight) ?? idleFrame;
            attackFrame = LoadFrame(attackResource, worldHeight) ?? idleFrame;
            hitFrame = LoadFrame(hitResource, worldHeight) ?? idleFrame;
            deathFrame = LoadFrame(deathResource, worldHeight);
            lastPosition = root.position;
            if (idleFrame != null) spriteRenderer.sprite = idleFrame;
        }

        private void Update()
        {
            if (trackedRoot == null || spriteRenderer == null || dead || action != null) return;
            var moving = Vector3.Distance(trackedRoot.position, lastPosition) > 0.0025f;
            lastPosition = trackedRoot.position;
            spriteRenderer.sprite = moving ? moveFrame : idleFrame;
            if (moving) ObservedMove = true;
            else ObservedIdle = true;
        }

        public void PlayAttack(float holdSeconds = 0.24f)
        {
            if (dead) return;
            ObservedAttack = true;
            BeginAction(HoldFrame(attackFrame, holdSeconds));
        }

        public void PlayHit()
        {
            if (dead) return;
            ObservedHit = true;
            BeginAction(HoldFrame(hitFrame, 0.14f, true));
        }

        public void PlayDeath()
        {
            dead = true;
            ObservedDeath = true;
            if (action != null) StopCoroutine(action);
            action = null;
            if (spriteRenderer != null && deathFrame != null) spriteRenderer.sprite = deathFrame;
        }

        private void BeginAction(IEnumerator routine)
        {
            if (action != null) StopCoroutine(action);
            action = StartCoroutine(routine);
        }

        private IEnumerator HoldFrame(Sprite frame, float seconds, bool realtime = false)
        {
            if (frame != null) spriteRenderer.sprite = frame;
            if (realtime) yield return new WaitForSecondsRealtime(seconds);
            else yield return new WaitForSeconds(seconds);
            action = null;
        }

        private static Sprite LoadFrame(string resource, float worldHeight)
        {
            if (string.IsNullOrEmpty(resource)) return null;
            var texture = Resources.Load<Texture2D>(resource);
            return texture == null ? null : Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.06f), texture.height / worldHeight);
        }
    }
}
