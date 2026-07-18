using System.Collections;
using UnityEngine;

namespace Nightfall3.Presentation
{
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class BossSpriteAnimator : MonoBehaviour
    {
        private Coroutine action;
        private Sprite cleave;
        private Sprite convergence;
        private int phase = 1;
        private readonly Sprite[] phaseFrames = new Sprite[3];
        private SpriteRenderer spriteRenderer;
        private Sprite rupture;

        public void Configure(float worldHeight)
        {
            spriteRenderer = GetComponent<SpriteRenderer>();
            phaseFrames[0] = Load("castellan-phase-1-v2", worldHeight);
            phaseFrames[1] = Load("castellan-phase-2-v2", worldHeight);
            phaseFrames[2] = Load("castellan-phase-3-v2", worldHeight);
            cleave = Load("castellan-cleave-v2", worldHeight);
            rupture = Load("castellan-rupture-v2", worldHeight);
            convergence = Load("castellan-convergence-v2", worldHeight);
            spriteRenderer.sprite = phaseFrames[0];
        }

        public void SetPhase(int value)
        {
            phase = Mathf.Clamp(value, 1, 3);
            if (action != null)
            {
                StopCoroutine(action);
                action = null;
            }
            if (spriteRenderer != null) spriteRenderer.sprite = phaseFrames[phase - 1];
        }

        public void PlayAttack(int attackPhase)
        {
            if (spriteRenderer == null) return;
            if (action != null) StopCoroutine(action);
            var frame = attackPhase == 1 ? cleave : attackPhase == 2 ? rupture : convergence;
            action = StartCoroutine(ActionRoutine(frame, attackPhase == 3 ? 0.82f : 0.68f));
        }

        private IEnumerator ActionRoutine(Sprite frame, float duration)
        {
            spriteRenderer.sprite = frame;
            yield return new WaitForSeconds(duration);
            spriteRenderer.sprite = phaseFrames[phase - 1];
            action = null;
        }

        private static Sprite Load(string name, float worldHeight)
        {
            var texture = Resources.Load<Texture2D>($"Art/Bosses/{name}");
            return texture == null ? null : Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.06f), texture.height / worldHeight);
        }
    }
}
