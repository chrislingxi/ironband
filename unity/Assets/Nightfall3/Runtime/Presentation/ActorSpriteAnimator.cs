using System.Collections;
using UnityEngine;

namespace Nightfall3.Presentation
{
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class ActorSpriteAnimator : MonoBehaviour
    {
        private Sprite attackDraw;
        private Sprite attackRelease;
        private Coroutine action;
        private Sprite defeatedFrame;
        private Sprite hitFrame;
        private Sprite[] idleFrames;
        private Vector3 lastPosition;
        private SpriteRenderer spriteRenderer;
        private Sprite[] runFrames;
        private Transform trackedRoot;
        private bool defeated;

        public bool ObservedIdle { get; private set; }
        public bool ObservedRun { get; private set; }
        public bool ObservedAttack { get; private set; }
        public bool ObservedHit { get; private set; }
        public bool ObservedDefeated { get; private set; }

        public void ConfigureDuskweaver(Transform root, float worldHeight)
        {
            trackedRoot = root;
            spriteRenderer = GetComponent<SpriteRenderer>();
            idleFrames = LoadFrames(worldHeight, "duskweaver-idle-a-v3", "duskweaver-idle-b-v3");
            runFrames = LoadFrames(worldHeight, "duskweaver-run-a-v3", "duskweaver-run-b-v3");
            attackDraw = LoadFrame("duskweaver-draw-v3", worldHeight);
            attackRelease = LoadFrame("duskweaver-release-v3", worldHeight);
            hitFrame = LoadFrame("duskweaver-hit-v3", worldHeight);
            defeatedFrame = LoadFrame("duskweaver-defeated-v3", worldHeight);
            lastPosition = root.position;
            if (idleFrames.Length > 0) spriteRenderer.sprite = idleFrames[0];
        }

        private void Update()
        {
            if (trackedRoot == null || spriteRenderer == null || defeated || action != null) return;
            var distance = Vector3.Distance(trackedRoot.position, lastPosition);
            lastPosition = trackedRoot.position;
            var moving = distance > 0.0025f;
            var frames = moving ? runFrames : idleFrames;
            if (frames == null || frames.Length == 0) return;
            var cadence = moving ? 7.5f : 1.8f;
            spriteRenderer.sprite = frames[Mathf.FloorToInt(Time.time * cadence) % frames.Length];
            if (moving) ObservedRun = true;
            else ObservedIdle = true;
        }

        public void PlayAttack()
        {
            if (!defeated)
            {
                ObservedAttack = true;
                BeginAction(AttackRoutine());
            }
        }

        public void PlayHit()
        {
            if (!defeated)
            {
                ObservedHit = true;
                BeginAction(HitRoutine());
            }
        }

        public void SetDefeated(bool value)
        {
            defeated = value;
            if (value) ObservedDefeated = true;
            if (action != null)
            {
                StopCoroutine(action);
                action = null;
            }
            if (spriteRenderer == null) return;
            spriteRenderer.sprite = value ? defeatedFrame : idleFrames?[0];
        }

        private void BeginAction(IEnumerator routine)
        {
            if (action != null) StopCoroutine(action);
            action = StartCoroutine(routine);
        }

        private IEnumerator AttackRoutine()
        {
            spriteRenderer.sprite = attackDraw;
            yield return new WaitForSeconds(0.1f);
            spriteRenderer.sprite = attackRelease;
            yield return new WaitForSeconds(0.16f);
            action = null;
        }

        private IEnumerator HitRoutine()
        {
            spriteRenderer.sprite = hitFrame;
            yield return new WaitForSecondsRealtime(0.13f);
            action = null;
        }

        private static Sprite[] LoadFrames(float worldHeight, params string[] names)
        {
            var frames = new Sprite[names.Length];
            for (var i = 0; i < names.Length; i++) frames[i] = LoadFrame(names[i], worldHeight);
            return frames;
        }

        private static Sprite LoadFrame(string name, float worldHeight)
        {
            var texture = Resources.Load<Texture2D>($"Art/Characters/{name}");
            return texture == null ? null : Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.06f), texture.height / worldHeight);
        }
    }
}
